const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

// Todas las rutas requieren autenticación y rate limiting
router.use(requireAuth);
router.use(aiLimiter);

// POST /api/ai/chat — Enviar mensaje
router.post('/chat', aiController.chat);

// GET /api/ai/chat/sessions — Listar sesiones
router.get('/chat/sessions', aiController.listSessions);

// GET /api/ai/chat/sessions/:session_id — Obtener sesión específica
router.get('/chat/sessions/:session_id', aiController.getSession);

// GET /api/ai/planeaciones/:id/pdf — Descargar PDF
router.get('/planeaciones/:id/pdf', async (req, res, next) => {
  try {
    const { turso } = require('../config/turso');
    const pdfService = require('../services/pdf.service');
    const result = await turso.execute({
      sql: `SELECT * FROM planeaciones WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrada' });
    const plan = result.rows[0];

    const teacherRes = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    pdfService.generatePlaneacionPDF(plan, teacherRes.rows[0] || {}, res);
  } catch (err) { next(err); }
});

// DELETE /api/ai/chat/sessions/:session_id — Eliminar sesión
router.delete('/chat/sessions/:session_id', aiController.deleteSession);

// DELETE /api/ai/chat/sessions — Eliminar TODAS las sesiones
router.delete('/chat/sessions', aiController.deleteAllSessions);

// Rutas heredadas (mantener por compatibilidad hasta FIX #5)
// ── Generar planeación didáctica ──
router.post('/planeacion', async (req, res, next) => {
  try {
    const aiService = require('../services/ai.service');
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

// ── Listar planeaciones ──
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

module.exports = router;
