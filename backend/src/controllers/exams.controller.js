const { turso } = require('../config/turso');
const crypto = require('crypto');

exports.list = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM exams WHERE teacher_id = ? ORDER BY exam_date DESC`,
      args: [req.user.id],
    });

    res.json({ exams: result.rows || [] });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, subject, group_name, total_items, examType } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ error: 'Título y materia son requeridos' });
    }

    let ai_content = '';
    try {
      const aiService = require('../services/ai.service');
      const aiRes = await aiService.generateExam({ title, subject, group_name, total_items, examType });
      ai_content = aiRes.content;
    } catch (e) {
      console.error('Error generando examen con IA:', e);
      ai_content = 'Error al generar el contenido con IA.';
    }

    const id = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO exams (id, teacher_id, title, subject, group_name, total_items, content) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, req.user.id, title, subject, group_name || 'Sin grupo', total_items || 20, ai_content],
    });

    res.status(201).json({ exam: { id, title, subject, content: ai_content } });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM exams WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    res.json({ exam: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await turso.execute({
      sql: `DELETE FROM exams WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    res.json({ message: 'Examen eliminado' });
  } catch (err) {
    next(err);
  }
};
