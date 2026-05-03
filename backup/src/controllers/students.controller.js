const { turso } = require('../config/turso');
const crypto    = require('crypto');

// ── Listar alumnos con stats ───────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM students WHERE teacher_id = ? AND status != 'deleted' ORDER BY list_number ASC`,
      args: [req.user.id],
    });

    const students = [];
    for (const student of result.rows) {
      const scoresResult = await turso.execute({
        sql: `SELECT score FROM exam_results WHERE student_id = ? ORDER BY created_at DESC`,
        args: [student.id],
      });

      const scores    = scoresResult.rows?.map(r => r.score) || [];
      const avg       = scores.length ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : null;
      const trend     = scores.length >= 2 ? (scores[0] - scores[1]).toFixed(1) : 0;

      students.push({ ...student, avg, trend, exams_count: scores.length });
    }

    res.json({ students, total: students.length });
  } catch (err) {
    next(err);
  }
};

// ── Crear alumno ───────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { name, list_number, curp, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    const id = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO students (id, teacher_id, name, list_number, curp, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, req.user.id, name.trim(), list_number || null, curp?.trim() || null, notes?.trim() || null],
    });

    res.status(201).json({ student: { id, name, list_number, curp, notes } });
  } catch (err) {
    next(err);
  }
};

// ── Importar desde CSV ─────────────────────────────────────────────────────
exports.importCSV = async (req, res, next) => {
  try {
    const { csv_data } = req.body;

    if (!csv_data?.trim()) {
      return res.status(400).json({ error: 'Datos CSV requeridos' });
    }

    const lines  = csv_data.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'El CSV debe tener al menos una fila de datos' });
    }

    // Omitir header
    const dataLines = lines.slice(1);
    const imported  = [];
    const errors    = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      // Soporta coma y punto y coma como delimitadores
      const sep    = line.includes(';') ? ';' : ',';
      const cols   = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));

      const list_number = cols[0] ? parseInt(cols[0]) : null;
      const name        = cols[1]?.trim();
      const notes       = cols[2]?.trim() || null;

      if (!name) {
        errors.push({ line: i + 2, error: 'Nombre vacío' });
        continue;
      }

      const id = crypto.randomUUID();
      try {
        await turso.execute({
          sql: `INSERT INTO students (id, teacher_id, name, list_number, notes) VALUES (?, ?, ?, ?, ?)`,
          args: [id, req.user.id, name, list_number, notes],
        });
        imported.push({ id, name, list_number });
      } catch (rowErr) {
        errors.push({ line: i + 2, name, error: rowErr.message });
      }
    }

    res.json({
      imported: imported.length,
      errors: errors.length,
      students: imported,
      error_details: errors,
    });
  } catch (err) {
    next(err);
  }
};

// ── Obtener alumno ─────────────────────────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM students WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json({ student: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Actualizar alumno ──────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const { name, list_number, curp, notes, status } = req.body;

    await turso.execute({
      sql: `UPDATE students SET name = ?, list_number = ?, curp = ?, notes = ?, status = ? WHERE id = ? AND teacher_id = ?`,
      args: [name, list_number, curp, notes, status, req.params.id, req.user.id],
    });

    res.json({ message: 'Alumno actualizado' });
  } catch (err) {
    next(err);
  }
};

// ── Eliminar alumno ────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    await turso.execute({
      sql: `DELETE FROM students WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    res.json({ message: 'Alumno eliminado' });
  } catch (err) {
    next(err);
  }
};

// ── Stats de alumno ────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT score, created_at FROM exam_results WHERE student_id = ? AND teacher_id = ? ORDER BY created_at ASC`,
      args: [req.params.id, req.user.id],
    });

    const scores  = result.rows?.map(r => r.score) || [];
    const avg     = scores.length ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : 0;
    const highest = Math.max(...scores, 0);
    const lowest  = Math.min(...scores, 100);
    const status  = avg >= 70 ? 'ok' : avg >= 60 ? 'watch' : 'risk';

    res.json({
      results: result.rows,
      stats:   { avg, highest, lowest, total_exams: scores.length, status },
    });
  } catch (err) {
    next(err);
  }
};
