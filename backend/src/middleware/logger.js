/**
 * Logger Middleware — IntelliExam v3
 * Logs estructurados para debugging en Railway/producción
 * Logs van a: stdout (Railway los captura automáticamente)
 * Ver en: Railway dashboard → Deployments → tu deploy → Logs
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug | info | warn | error
const IS_DEV    = process.env.NODE_ENV !== 'production';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

function formatLog(level, category, message, meta = {}) {
  const ts   = new Date().toISOString();
  const icon = { debug: '🔍', info: '✅', warn: '⚠️', error: '❌' }[level] || '📋';

  if (IS_DEV) {
    // Formato legible en desarrollo
    const metaStr = Object.keys(meta).length
      ? '\n  ' + Object.entries(meta).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n  ')
      : '';
    return `${icon} [${ts}] [${level.toUpperCase()}] [${category}] ${message}${metaStr}`;
  }

  // Formato JSON para Railway/producción (fácil de parsear)
  return JSON.stringify({ ts, level, category, message, ...meta });
}

const logger = {
  debug: (cat, msg, meta) => shouldLog('debug') && console.log(formatLog('debug', cat, msg, meta)),
  info:  (cat, msg, meta) => shouldLog('info')  && console.log(formatLog('info',  cat, msg, meta)),
  warn:  (cat, msg, meta) => shouldLog('warn')  && console.warn(formatLog('warn',  cat, msg, meta)),
  error: (cat, msg, meta) => shouldLog('error') && console.error(formatLog('error', cat, msg, meta)),
};

// ── Request logger middleware ──────────────────────────────────────────────────
function requestLogger(req, res, next) {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  req.reqId   = reqId;

  // Log de entrada
  logger.info('HTTP', `→ ${req.method} ${req.path}`, {
    reqId,
    ip:     req.ip || req.connection?.remoteAddress,
    ua:     req.get('user-agent')?.slice(0, 80),
    userId: req.user?.id || 'unauthenticated',
  });

  // Intercept response finish
  const originalEnd  = res.end.bind(res);
  res.end = function(...args) {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level]('HTTP', `← ${req.method} ${req.path} ${res.statusCode} (${ms}ms)`, {
      reqId,
      status: res.statusCode,
      ms,
      userId: req.user?.id || 'unauthenticated',
    });
    return originalEnd(...args);
  };

  next();
}

// ── AI usage logger ────────────────────────────────────────────────────────────
function logAIUsage(teacherId, model, tokensIn, tokensOut, feature) {
  const cost = (tokensIn * 0.000003) + (tokensOut * 0.000015); // Claude Sonnet 3.5 pricing
  logger.info('AI', `Tokens usados: ${tokensIn + tokensOut}`, {
    teacherId,
    model,
    tokensIn,
    tokensOut,
    totalTokens:   tokensIn + tokensOut,
    costUSD:       cost.toFixed(6),
    feature,       // 'chat' | 'planeacion' | 'exam' | 'feedback'
  });
}

// ── Error logger ───────────────────────────────────────────────────────────────
function logError(category, error, meta = {}) {
  logger.error(category, error.message, {
    stack:   IS_DEV ? error.stack : error.stack?.split('\n')[1]?.trim(),
    name:    error.name,
    ...meta,
  });
}

// ── DB query logger (solo en debug) ───────────────────────────────────────────
function logDB(sql, args, ms) {
  if (!shouldLog('debug')) return;
  logger.debug('DB', sql.slice(0, 80), { args: args?.slice(0,3), ms });
}

module.exports = { logger, requestLogger, logAIUsage, logError, logDB };
