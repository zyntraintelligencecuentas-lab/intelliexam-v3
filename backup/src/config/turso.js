const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Test connection y listado de tablas
turso.execute("SELECT name FROM sqlite_master WHERE type='table';")
  .then(res => {
    console.log('[TURSO] Tablas encontradas:', res.rows.map(r => r.name));
  })
  .catch(err => {
    console.error('[TURSO] Error de conexión:', err.message);
  });

module.exports = { turso };
