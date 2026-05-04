const { turso } = require('../config/turso');
const crypto = require('crypto');

/**
 * GET SETTINGS - Obtener perfil y configuración del docente
 */
exports.getSettings = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id]
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE PROFILE - Actualizar datos básicos
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, school, grade, group_name } = req.body;

    await turso.execute({
      sql: `UPDATE profiles 
            SET full_name = ?, school = ?, grade = ?, group_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [full_name, school, grade, group_name, req.user.id]
    });

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE PASSWORD - Cambiar contraseña
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const bcrypt = require('bcryptjs');

    const result = await turso.execute({
      sql: `SELECT password FROM profiles WHERE id = ?`,
      args: [req.user.id]
    });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);

    await turso.execute({
      sql: `UPDATE profiles SET password = ? WHERE id = ?`,
      args: [hashed, req.user.id]
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada'
    });
  } catch (err) {
    next(err);
  }
};
