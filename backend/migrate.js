require('dotenv').config();
const { turso } = require('./src/config/turso');

async function migrate() {
  console.log('🔄 Ejecutando migración de base de datos...\n');

  const migrations = [
    // Agregar session_id a ai_chats si no existe
    {
      name: 'ai_chats.session_id',
      sql: `ALTER TABLE ai_chats ADD COLUMN session_id TEXT`,
    },
    // Crear índice para sesiones
    {
      name: 'idx_ai_chats_session',
      sql: `CREATE INDEX IF NOT EXISTS idx_ai_chats_session ON ai_chats(teacher_id, session_id)`,
    },
    // Crear tabla ai_chats si no existe (para instalaciones nuevas)
    {
      name: 'ai_chats table',
      sql: `CREATE TABLE IF NOT EXISTS ai_chats (
        id         TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES profiles(id)
      )`,
    },
    // Crear tabla profiles si no existe
    {
      name: 'profiles table',
      sql: `CREATE TABLE IF NOT EXISTS profiles (
        id         TEXT PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        full_name  TEXT NOT NULL,
        school     TEXT,
        grade      TEXT,
        group_name TEXT,
        plan       TEXT DEFAULT 'free',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    // Crear tabla auth si no existe
    {
      name: 'auth table',
      sql: `CREATE TABLE IF NOT EXISTS auth (
        user_id       TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES profiles(id)
      )`,
    },
    // Crear tabla students si no existe
    {
      name: 'students table',
      sql: `CREATE TABLE IF NOT EXISTS students (
        id         TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        name       TEXT NOT NULL,
        list_number INTEGER,
        curp       TEXT,
        notes      TEXT,
        status     TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES profiles(id)
      )`,
    },
    // Crear tabla exams si no existe
    {
      name: 'exams table',
      sql: `CREATE TABLE IF NOT EXISTS exams (
        id         TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        title      TEXT,
        subject    TEXT NOT NULL,
        group_name TEXT,
        total_items INTEGER DEFAULT 20,
        ocr_raw    TEXT,
        status     TEXT DEFAULT 'draft',
        exam_date  DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES profiles(id)
      )`,
    },
    // Crear tabla exam_results si no existe
    {
      name: 'exam_results table',
      sql: `CREATE TABLE IF NOT EXISTS exam_results (
        id         TEXT PRIMARY KEY,
        exam_id    TEXT NOT NULL,
        student_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        score      REAL NOT NULL,
        correct    INTEGER,
        incorrect  INTEGER,
        blank      INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id)    REFERENCES exams(id),
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (teacher_id) REFERENCES profiles(id)
      )`,
    },
    // Crear tabla reports si no existe
    {
      name: 'reports table',
      sql: `CREATE TABLE IF NOT EXISTS reports (
        id         TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        type       TEXT NOT NULL,
        title      TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES profiles(id)
      )`,
    },
  ];

  for (const m of migrations) {
    try {
      await turso.execute({ sql: m.sql, args: [] });
      console.log(`  ✅ ${m.name}`);
    } catch (err) {
      // Ignorar errores de "column already exists" o "table already exists"
      if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
        console.log(`  ⏭️  ${m.name} — ya existe, omitiendo`);
      } else {
        console.warn(`  ⚠️  ${m.name} — ${err.message}`);
      }
    }
  }

  console.log('\n✅ Migración completada\n');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});
