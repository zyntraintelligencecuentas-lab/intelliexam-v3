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

    // Generar contenido con Sophia IA
    console.log('[REPORTS] Iniciando generación de planeación para:', { materia, tema, grado });
    const aiResult = await aiService.generatePlaneacion(req.user.id, {
      materia, grado, tema, duracion, semanas,
    });
    console.log('[REPORTS] IA completó la generación exitosamente');

    // Generar HTML del PDF
    const html = pdfService.generatePlaneacionHTML({
      content: aiResult.content,
      materia,
      tema,
      grado,
      teacher,
    });

    // Guardar registro del reporte con contenido para descarga posterior
    await turso.execute({
      sql: `INSERT INTO reports (id, teacher_id, type, title, content) VALUES (?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), req.user.id, 'planeacion', `Planeación: ${tema} — ${materia}`, aiResult.content],
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

    let ai_feedback = "Sin datos suficientes para retroalimentación.";
    if (scores.length > 0) {
      try {
        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const prompt = `Eres Sophia, asistente pedagógica. Actúa como docente. 
El alumno ${student.name} tiene un promedio de ${student.avg}% en ${student.exams_count} exámenes.
Sus calificaciones recientes son: ${scores.slice(0,3).join(', ')}.
Notas del docente: ${student.notes || 'Ninguna'}.
Genera un mini-feedback (máximo 3 oraciones) cálido y profesional sobre su estado, indicando si va bien, si necesita apoyo y un consejo rápido.`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        });
        ai_feedback = response.choices[0].message.content;
      } catch (err) {
        console.error('[AI Feedback Error]:', err.message);
        ai_feedback = "Feedback no disponible temporalmente.";
      }
    }

    res.json({ student, exams, ai_feedback });
  } catch (err) {
    next(err);
  }
};
// ── Descargar reporte (servir HTML para imprimir) ───────────────────────────
exports.download = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM reports WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    if (!result.rows.length) {
      return res.status(404).send('<h1>Reporte no encontrado</h1>');
    }

    const report = result.rows[0];

    // Obtener datos del docente para el encabezado
    const teacherResult = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    const teacher = teacherResult.rows[0] || {};

    let html = '';
    if (report.type === 'planeacion') {
      // Intentar extraer materia, grado, tema del título si no están guardados explícitamente
      // Formato esperado: "Planeación: Tema — Materia"
      const titleParts = report.title.replace('Planeación: ', '').split(' — ');
      const tema    = titleParts[0] || 'Tema';
      const materia = titleParts[1] || 'Asignatura';

      html = pdfService.generatePlaneacionHTML({
        content: report.content,
        materia,
        tema,
        grado: teacher.group_name || 'N/A',
        teacher,
      });
    } else if (report.type === 'group') {
      // Re-generar reporte grupal
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

      html = pdfService.generateGroupReportHTML({
        students,
        teacher,
        groupName: teacher.group_name || 'Grupo',
      });
    } else {
      html = `<html><body><h1>Reporte: ${report.title}</h1><pre>${report.content}</pre></body></html>`;
    }

    res.send(html);
  } catch (err) {
    next(err);
  }
};
