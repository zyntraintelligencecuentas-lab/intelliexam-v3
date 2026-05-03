const crypto = require('crypto');

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const [headerB64, payloadB64, signatureB64] = token.split('.');

    if (!headerB64 || !payloadB64 || !signatureB64) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const secret = process.env.JWT_SECRET;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    if (signatureB64 !== expectedSig) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Token expirado' });
    }

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth };
