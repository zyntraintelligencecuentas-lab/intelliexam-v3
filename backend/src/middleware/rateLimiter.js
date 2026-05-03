const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  message: { error: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 200 : 30,
  message: { error: 'Límite de consultas IA alcanzado' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login' },
});

module.exports = { globalLimiter, aiLimiter, authLimiter };
