const { turso } = require('../config/turso');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

function generateJWT(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  })).toString('base64');

  const secret = process.env.JWT_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${header}.${payload}.${signature}`;
}

exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name, school } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Contraseña debe tener 8+ caracteres' });
    }

    const userId = crypto.randomUUID();
    const hashedPwd = await bcrypt.hash(password, SALT_ROUNDS);

    await turso.execute({
      sql: `INSERT INTO profiles (id, email, full_name, school) VALUES (?, ?, ?, ?)`,
      args: [userId, email, full_name, school || null],
    });

    await turso.execute({
      sql: `INSERT INTO auth (user_id, password_hash) VALUES (?, ?)`,
      args: [userId, hashedPwd],
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id: userId, email, full_name },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const result = await turso.execute({
      sql: `SELECT p.id, p.email, p.full_name, p.plan, a.password_hash FROM profiles p
            LEFT JOIN auth a ON p.id = a.user_id WHERE p.email = ?`,
      args: [email],
    });

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordMatch = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];
    const token = generateJWT(user.id);

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, plan: user.plan },
      access_token: token,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  res.json({ message: 'Sesión cerrada' });
};

exports.me = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT id, email, full_name, school, grade, group_name, plan FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, school, grade, group_name } = req.body;

    await turso.execute({
      sql: `UPDATE profiles SET full_name = ?, school = ?, grade = ?, group_name = ? WHERE id = ?`,
      args: [full_name, school, grade, group_name, req.user.id],
    });

    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    next(err);
  }
};
