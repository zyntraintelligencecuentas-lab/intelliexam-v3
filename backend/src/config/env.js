const required = [
  'TURSO_CONNECTION_URL',
  'TURSO_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'JWT_SECRET',
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ Variables de entorno faltantes:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nCopia las variables en backend/.env\n');
  process.exit(1);
}

module.exports = { validated: true };
