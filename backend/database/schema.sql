-- IntelliExam v3 - Schema de Base de Datos TURSO
-- Ejecuta este archivo completo en tu CLI de Turso

-- ================================================
-- 1. TABLA: profiles (Usuarios/Profesores)
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  school TEXT,
  grade TEXT,
  group_name TEXT,
  plan TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ================================================
-- 2. TABLA: auth (Autenticación)
-- ================================================
CREATE TABLE IF NOT EXISTS auth (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ================================================
-- 3. TABLA: students (Estudiantes)
-- ================================================
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  list_number INTEGER,
  curp TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_list_number ON students(teacher_id, list_number);

-- ================================================
-- 4. TABLA: exams (Exámenes)
-- ================================================
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT,
  subject TEXT NOT NULL,
  group_name TEXT,
  total_items INTEGER DEFAULT 20,
  ocr_raw TEXT,
  answer_key TEXT,
  status TEXT DEFAULT 'draft',
  exam_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exams_teacher ON exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date DESC);

-- ================================================
-- 5. TABLA: exam_results (Resultados de Exámenes)
-- ================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  score REAL NOT NULL,
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  blank INTEGER DEFAULT 0,
  answers_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_teacher ON exam_results(teacher_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON exam_results(created_at DESC);

-- ================================================
-- 6. TABLA: reports (Reportes Generados)
-- ================================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('individual', 'group', 'executive')),
  title TEXT,
  content TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_teacher ON reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(created_at DESC);

-- ================================================
-- 7. TABLA: ai_chats (Historial de Chat con IA)
-- ================================================
CREATE TABLE IF NOT EXISTS ai_chats (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  model TEXT DEFAULT 'claude-sonnet-4-5',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_chats_teacher ON ai_chats(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_date ON ai_chats(created_at DESC);

-- ================================================
-- 8. VISTA: student_stats (Estadísticas de Estudiantes)
-- ================================================
CREATE VIEW IF NOT EXISTS student_stats AS
SELECT
  s.id,
  s.teacher_id,
  s.name,
  s.list_number,
  COUNT(er.id) as total_exams,
  ROUND(AVG(er.score), 2) as average_score,
  MAX(er.score) as highest_score,
  MIN(er.score) as lowest_score,
  CASE
    WHEN AVG(er.score) >= 70 THEN 'ok'
    WHEN AVG(er.score) >= 60 THEN 'watch'
    ELSE 'risk'
  END as status
FROM students s
LEFT JOIN exam_results er ON s.id = er.student_id
GROUP BY s.id, s.teacher_id, s.name, s.list_number;

-- ================================================
-- 9. VISTA: teacher_overview (Resumen del Profesor)
-- ================================================
CREATE VIEW IF NOT EXISTS teacher_overview AS
SELECT
  p.id as teacher_id,
  p.full_name,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT e.id) as total_exams,
  COUNT(DISTINCT er.id) as total_results,
  ROUND(AVG(er.score), 2) as overall_average
FROM profiles p
LEFT JOIN students s ON p.id = s.teacher_id
LEFT JOIN exams e ON p.id = e.teacher_id
LEFT JOIN exam_results er ON p.id = er.teacher_id
GROUP BY p.id, p.full_name;

-- ================================================
-- DATOS DE PRUEBA (Opcional - Elimina si no quieres)
-- ================================================

-- Usuario de prueba
INSERT OR IGNORE INTO profiles (id, email, full_name, school, plan)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'demo@intelliexam.com',
  'Profesor Demo',
  'Escuela Primaria Demo',
  'pro'
);

-- Contraseña: Demo1234 (hash SHA-256)
INSERT OR IGNORE INTO auth (user_id, password_hash)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea'
);

-- ================================================
-- FIN DEL SCHEMA
-- ================================================

-- Verificación de tablas creadas
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Agregar session_id a ai_chats (migracion adicional)
ALTER TABLE ai_chats ADD COLUMN session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_chats_session ON ai_chats(teacher_id, session_id);
