const crypto = require('crypto');
const { turso } = require('../config/turso');
const { logError, logAIUsage } = require('../middleware/logger');
const Anthropic = require('@anthropic-ai/sdk');

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * SEND MESSAGE - Enviar mensaje en chat y persistir
 * POST /api/ai/chat
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, history, sessionId, context } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mensaje no puede estar vacío',
        code: 'EMPTY_MESSAGE'
      });
    }

    // Si no hay sesión, crear una nueva
    const session_id = sessionId || crypto.randomUUID();

    // 1. GUARDAR MENSAJE DEL USUARIO EN BD
    const userMsgId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await turso.execute({
      sql: `INSERT INTO ai_chats (id, teacher_id, session_id, role, content, created_at) 
            VALUES (?, ?, ?, 'user', ?, ?)`,
      args: [userMsgId, req.user.id, session_id, message, now]
    });

    // 2. CONSTRUIR HISTORIAL DE MENSAJES
    const messages = (history || []).slice(-12); // Últimos 12 mensajes
    messages.push({ role: 'user', content: message });

    // 3. LLAMAR A CLAUDE
    const response = await anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: `Eres Ameyalli, la asistente pedagógica de IntelliExam. 
Eres cálida, profesional y siempre das respuestas prácticas y accionables para docentes mexicanos.
El docente se llama ${context?.teacherName || 'Profesor/a'}.`,
      messages: messages
    });

    const assistantMsg = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // 4. GUARDAR RESPUESTA DE CLAUDE EN BD
    const assistantMsgId = crypto.randomUUID();
    
    await turso.execute({
      sql: `INSERT INTO ai_chats (id, teacher_id, session_id, role, content, tokens_used, created_at) 
            VALUES (?, ?, ?, 'assistant', ?, ?, ?)`,
      args: [
        assistantMsgId, 
        req.user.id, 
        session_id, 
        assistantMsg, 
        response.usage.output_tokens || 0,
        now
      ]
    });

    // 5. LOG DE TOKENS USADOS
    logAIUsage('CHAT', response.usage, { 
      teacherId: req.user.id, 
      session_id,
      message_length: message.length 
    });

    // 6. RETORNAR RESPUESTA
    res.json({
      success: true,
      session_id: session_id,
      content: assistantMsg,
      tokens_used: response.usage.output_tokens
    });

  } catch (err) {
    logError('AI_CHAT', err, { userId: req.user.id, stack: err.stack });
    
    res.status(500).json({
      success: false,
      error: 'Error procesando chat',
      message: err.message
    });
  }
};

/**
 * LIST SESSIONS - Listar sesiones de chat del docente
 * GET /api/ai/chat/sessions
 */
exports.listSessions = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT session_id,
                   MIN(created_at) as started_at,
                   MAX(created_at) as last_msg_at,
                   COUNT(*) as msg_count,
                   (SELECT content FROM ai_chats
                    WHERE teacher_id = t.teacher_id 
                      AND session_id = t.session_id 
                      AND role = 'user'
                    ORDER BY created_at ASC LIMIT 1) as first_user_msg
            FROM ai_chats t
            WHERE teacher_id = ?
            GROUP BY session_id
            ORDER BY last_msg_at DESC
            LIMIT 20`,
      args: [req.user.id]
    });

    res.json({
      success: true,
      sessions: result.rows || []
    });

  } catch (err) {
    logError('AI_LIST_SESSIONS', err, { teacherId: req.user.id, stack: err.stack });
    next(err);
  }
};

/**
 * GET SESSION - Obtener mensajes de una sesión específica
 * GET /api/ai/chat/sessions/:session_id
 */
exports.getSession = async (req, res, next) => {
  try {
    const { session_id } = req.params;

    const result = await turso.execute({
      sql: `SELECT id, role, content, created_at 
            FROM ai_chats 
            WHERE teacher_id = ? AND session_id = ?
            ORDER BY created_at ASC`,
      args: [req.user.id, session_id]
    });

    res.json({
      success: true,
      session_id,
      messages: result.rows || []
    });

  } catch (err) {
    logError('AI_GET_SESSION', err, { sessionId: req.params.session_id, stack: err.stack });
    next(err);
  }
};

/**
 * DELETE SESSION - Eliminar una sesión completa
 * DELETE /api/ai/chat/sessions/:session_id
 */
exports.deleteSession = async (req, res, next) => {
  try {
    const { session_id } = req.params;

    await turso.execute({
      sql: `DELETE FROM ai_chats WHERE teacher_id = ? AND session_id = ?`,
      args: [req.user.id, session_id]
    });

    res.json({
      success: true,
      message: 'Sesión eliminada',
      session_id
    });

  } catch (err) {
    logError('AI_DELETE_SESSION', err, { sessionId: req.params.session_id, stack: err.stack });
    next(err);
  }
};

/**
 * DELETE ALL SESSIONS - Eliminar TODAS las sesiones del docente
 * DELETE /api/ai/chat/sessions
 */
exports.deleteAllSessions = async (req, res, next) => {
  try {
    await turso.execute({
      sql: `DELETE FROM ai_chats WHERE teacher_id = ?`,
      args: [req.user.id]
    });

    res.json({
      success: true,
      message: 'Todas las sesiones eliminadas'
    });

  } catch (err) {
    logError('AI_DELETE_ALL', err, { teacherId: req.user.id, stack: err.stack });
    next(err);
  }
};
