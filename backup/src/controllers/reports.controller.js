const { turso }  = require('../config/turso');
const crypto     = require('crypto');
const pdfService = require('../services/pdf.service');
const aiService  = require('../services/ai.service');

// ── Listar reportes ───────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM reports WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 50`,
      args: [req.user.id],
    });
    res.json({ reports: result.rows || [] });
  } catch (err) {
    next(err);
  }
};

// ── Generar reporte (guardar registro) ────────────────────────────────────────
exports.generate = async (req, res, next) => {
  try {
    const { type, title } = req.body;

    if (!type || !['individual', 'group', 'executive'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido: individual | group | executive' });
    }

    const id = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO reports (id, teacher_id, type, title) VALUES (?, ?, ?, ?)`,
      args: [id, req.user.id, type, title || `Reporte ${type}`],
    });

    res.status(201).json({ report_id: id, message: 'Reporte generado' });
  } catch (err) {
    next(err);
  }
};

// ── Generar PDF de planeación ─────────────────────────────────────────────────
exports.generatePlaneacionPDF = async (req, res, next) => {
  try {
    const { materia, grado, tema, duracion, semanas } = req.body;

    if (!materia || !grado || !tema) {
      return res.status(400).json({ error: 'materia, grado y tema son requeridos' });
    }

    // Obtener datos del docente
    const teacherResult = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    const teacher = teacherResult.rows[0] || {};

    // Generar contenido con Ameyalli IA
    const aiResult = await aiService.generatePlaneacion(req.user.id, {
      materia, grado, tema, duracion, semanas,
    });

    // Generar HTML del PDF
    const html = pdfService.generatePlaneacionHTML({
      content: aiResult.content,
      materia,
      tema,
      grado,
      teacher,
    });

    // Guardar registro del reporte
    await turso.execute({
      sql: `INSERT INTO reports (id, teacher_id, type, title) VALUES (?, ?, ?, ?)`,
      args: [crypto.randomUUID(), req.user.id, 'planeacion', `Planeación: ${tema} — ${materia}`],
    });

    // Enviar HTML para que el frontend lo imprima como PDF
    res.json({
      html,
      content: aiResult.content,
      tokens_used: aiResult.tokens_used,
      materia,
      tema,
      grado,
    });
  } catch (err) {
    next(err);
  }
};

// ── Generar PDF reporte grupal ────────────────────────────────────────────────
exports.generateGroupPDF = async (req, res, next) => {
  try {
    // Obtener alumnos
    const studentsResult = await turso.execute({
      sql: `SELECT * FROM students WHERE teacher_id = ? AND status != 'deleted' ORDER BY list_number ASC`,
      args: [req.user.id],
    });

    const students = [];
    for (const s of studentsResult.rows) {
      const sc = await turso.execute({
        sql: `SELECT score FROM exam_results WHERE student_id = ? ORDER BY created_at DESC`,
        args: [s.id],
      });
      const scores = sc.rows?.map(r => r.score) || [];
      const avg    = scores.length ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : null;
      students.push({ ...s, avg, exams_count: scores.length });
    }

    // Docente
    const teacherResult = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    const teacher = teacherResult.rows[0] || {};

    const html = pdfService.generateGroupReportHTML({
      students,
      teacher,
      groupName: teacher.group_name || 'Grupo',
    });

    res.json({ html });
  } catch (err) {
    next(err);
  }
};

// ── Reporte individual de alumno ──────────────────────────────────────────────
exports.getStudentReport = async (req, res, next) => {
  try {
    const studentResult = await turso.execute({
      sql: `SELECT * FROM students WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    if (!studentResult.rows.length) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const student = studentResult.rows[0];

    const examsResult = await turso.execute({
      sql: `SELECT * FROM exam_results WHERE student_id = ? ORDER BY created_at DESC`,
      args: [req.params.id],
    });

    const exams = examsResult.rows || [];
    const scores = exams.map(e => e.score);
    student.avg = scores.length ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : 0;
    student.exams_count = exams.length;

    res.json({ student, exams });
  } catch (err) {
    next(err);
  }
};
