import 'dotenv/config';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function runMigrations() {
  console.log('Iniciando migraciones en Turso...');

  try {
    // 1. Tabla exams
    await db.execute("ALTER TABLE exams ADD COLUMN content TEXT;").catch(e => console.log('Notice:', e.message));
    await db.execute("ALTER TABLE exams ADD COLUMN ai_generated BOOLEAN DEFAULT 0;").catch(e => console.log('Notice:', e.message));
    await db.execute("ALTER TABLE exams ADD COLUMN exam_type TEXT DEFAULT 'multiple_choice';").catch(e => console.log('Notice:', e.message));
    await db.execute("ALTER TABLE exams ADD COLUMN version INTEGER DEFAULT 1;").catch(e => console.log('Notice:', e.message));
    console.log('✓ Migración 1 (exams) completada (o ignorada si ya existían)');

    // 2. Tabla ai_chats
    await db.execute("CREATE INDEX IF NOT EXISTS idx_ai_chats_session ON ai_chats(teacher_id, session_id);").catch(e => console.log('Notice:', e.message));
    await db.execute("ALTER TABLE ai_chats ADD COLUMN topic TEXT;").catch(e => console.log('Notice:', e.message));
    await db.execute("ALTER TABLE ai_chats ADD COLUMN tokens_used INTEGER DEFAULT 0;").catch(e => console.log('Notice:', e.message));
    console.log('✓ Migración 2 (ai_chats) completada');

    // 3. Tabla reports
    await db.execute("CREATE INDEX IF NOT EXISTS idx_reports_teacher_type ON reports(teacher_id, type);").catch(e => console.log('Notice:', e.message));
    console.log('✓ Migración 3 (reports) completada');

    // 4. Tabla exam_scans
    await db.execute(`
      CREATE TABLE IF NOT EXISTS exam_scans (
        id TEXT PRIMARY KEY,
        exam_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        image_url TEXT,
        ocr_text TEXT,
        confidence REAL DEFAULT 0.0,
        processed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
    `).catch(e => console.log('Notice:', e.message));
    await db.execute("CREATE INDEX IF NOT EXISTS idx_exam_scans_exam ON exam_scans(exam_id);").catch(e => console.log('Notice:', e.message));
    await db.execute("CREATE INDEX IF NOT EXISTS idx_exam_scans_teacher ON exam_scans(teacher_id);").catch(e => console.log('Notice:', e.message));
    console.log('✓ Migración 4 (exam_scans) completada');

    // 5. Tabla exam_versions
    await db.execute(`
      CREATE TABLE IF NOT EXISTS exam_versions (
        id TEXT PRIMARY KEY,
        exam_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        title TEXT,
        subject TEXT,
        content TEXT,
        changed_by TEXT NOT NULL,
        change_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES profiles(id) ON DELETE CASCADE
      );
    `).catch(e => console.log('Notice:', e.message));
    await db.execute("CREATE INDEX IF NOT EXISTS idx_exam_versions_exam ON exam_versions(exam_id);").catch(e => console.log('Notice:', e.message));
    await db.execute("CREATE INDEX IF NOT EXISTS idx_exam_versions_number ON exam_versions(exam_id, version_number);").catch(e => console.log('Notice:', e.message));
    console.log('✓ Migración 5 (exam_versions) completada');

    console.log('¡Todas las migraciones se aplicaron con éxito!');

  } catch (error) {
    console.error('Error crítico aplicando migraciones:', error);
  }
}

runMigrations();
