const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { aiLimiter }   = require('../middleware/rateLimiter');
const aiService       = require('../services/ai.service');

router.use(requireAuth);
router.use(aiLimiter);

// ── Chat principal ─────────────────────────────────────────────────────────
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [], sessionId, context } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    const messages = [
      ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const result = await aiService.chat(req.user.id, messages, {
      ...context,
      sessionId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Historial de mensajes ──────────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const history = await aiService.getChatHistory(req.user.id);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// ── Listar sesiones ────────────────────────────────────────────────────────
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await aiService.listChatSessions(req.user.id);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// ── Mensajes de una sesión ─────────────────────────────────────────────────
router.get('/sessions/:sessionId', async (req, res, next) => {
  try {
    const allHistory = await aiService.getChatHistory(req.user.id, 200);
    const msgs = allHistory.filter(m => m.session_id === req.params.sessionId);
    res.json({ messages: msgs });
  } catch (err) {
    next(err);
  }
});

// ── Eliminar sesión ────────────────────────────────────────────────────────
router.delete('/sessions/:sessionId', async (req, res, next) => {
  try {
    const result = await aiService.deleteChatSession(req.user.id, req.params.sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Generar planeación didáctica ───────────────────────────────────────────
router.post('/planeacion', async (req, res, next) => {
  try {
    const { materia, grado, tema, duracion, semanas } = req.body;

    if (!materia || !grado || !tema) {
      return res.status(400).json({ error: 'materia, grado y tema son requeridos' });
    }

    const result = await aiService.generatePlaneacion(req.user.id, {
      materia, grado, tema, duracion, semanas,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Listar planeaciones ───────────────────────────────────────────────────
router.get('/planeaciones', async (req, res, next) => {
  try {
    const { turso } = require('../config/turso');
    const result = await turso.execute({
      sql: `SELECT * FROM planeaciones WHERE teacher_id = ? ORDER BY created_at DESC`,
      args: [req.user.id],
    });
    res.json({ planeaciones: result.rows || [] });
  } catch (err) {
    next(err);
  }
});

// ── Descargar planeación en PDF ───────────────────────────────────────────
router.get('/planeaciones/:id/pdf', async (req, res, next) => {
  try {
    const { turso } = require('../config/turso');
    const pdfService = require('../services/pdf.service');

    const result = await turso.execute({
      sql: `SELECT * FROM planeaciones WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    if (!result.rows.length) return res.status(404).json({ error: 'Planeación no encontrada' });
    const plan = result.rows[0];

    const teacherRes = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    const teacher = teacherRes.rows[0] || {};

    const html = pdfService.generatePlaneacionHTML({
      content: plan.content,
      materia: plan.materia,
      tema:    plan.tema,
      grado:   plan.grado,
      teacher,
    });

    res.json({ html, title: plan.tema, materia: plan.materia });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
