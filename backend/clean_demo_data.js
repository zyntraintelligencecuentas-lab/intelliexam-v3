require('dotenv').config({ path: './backend/.env' });
const { turso } = require('./src/config/turso');

async function clean() {
  console.log('🧹 Limpiando datos de demo...');

  const tables = [
    'exam_results',
    'exams',
    'students',
    'ai_chats',
    'reports'
  ];

  for (const table of tables) {
    try {
      await turso.execute({ sql: `DELETE FROM ${table}`, args: [] });
      console.log(`  ✅ Tabla ${table} vaciada`);
    } catch (err) {
      console.warn(`  ⚠️ Error limpiando ${table}: ${err.message}`);
    }
  }

  // Limpiar perfiles excepto los IDs de auth para no romper el login
  try {
    await turso.execute({ 
      sql: `UPDATE profiles SET full_name = 'Docente', school = NULL, grade = NULL, group_name = NULL, plan = 'pro'`, 
      args: [] 
    });
    console.log('  ✅ Perfiles reseteados a valores por defecto');
  } catch (err) {
    console.warn(`  ⚠️ Error reseteando perfiles: ${err.message}`);
  }

  console.log('\n✨ Sistema limpio y listo para producción.');
  process.exit(0);
}

clean().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
