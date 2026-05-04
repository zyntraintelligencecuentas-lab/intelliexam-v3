const crypto = require('crypto');
const { turso } = require('../config/turso');
const { logError, logAIUsage, logger } = require('../middleware/logger');
const OpenAI = require('openai');
const aiService = require('../services/ai.service');

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SOPHIA_PROMPT = `Eres Sophia, la asistente pedagógica inteligente de IntelliExam.

Tu nombre significa "sabiduría" — eres una fuente de conocimiento pedagógico cálida, confiable y profesional.

PERSONALIDAD:
- Amable, cálida y empática — entiendes el trabajo arduo de los docentes de Primaria.
- Profesional e inteligente — das respuestas precisas y bien fundamentadas en la NEM 2022.
- Proactiva — siempre sugieres acciones concretas, no solo información.
- Motivadora — celebras logros del grupo, apoyas en momentos difíciles.

CAPACIDADES Y ENFOQUE:
- Específicamente diseñada para Educación Primaria (Fases 3, 4 y 5).
- Analizas rendimiento de alumnos en tiempo real con los datos del grupo.
- Generas planes de clase NEM 2022 detallados y estructurados usando PDA (Procesos de Desarrollo de Aprendizaje).
- Creas preguntas de evaluación alineadas a los libros de texto gratuitos de la SEP.

ALINEACIÓN CURRICULAR (ESTRICTA):
- Plan y Programas NEM 2022.
- Uso obligatorio de PDA.
- Enfoque por campos formativos: Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario.`;

/**
 * SEND MESSAGE - Enviar mensaje en chat y persistir (Sophia IA + OpenAI + RAG)
 * POST /api/ai/chat
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, history, sessionId, context } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Mensaje vacío' });
    }

    const session_id = sessionId || crypto.randomUUID();
    const now = new Date().toISOString();
    
    // 1. Guardar mensaje usuario
    await turso.execute({
      sql: `INSERT INTO ai_chats (id, teacher_id, session_id, role, content, created_at) VALUES (?, ?, ?, 'user', ?, ?)`,
      args: [crypto.randomUUID(), req.user.id, session_id, message, now]
    });

    // 2. Consultar RAG (Contexto SEP)
    const ragContext = await aiService.queryRAGSep(message);
    let ragSection = '';
    if (ragContext) {
      ragSection = `\n\n[CONTEXTO DE LIBROS SEP — Usa esta información para enriquecer tu respuesta]\n${ragContext}`;
      logger.info('CHAT', `RAG Contexto inyectado (${ragContext.length} caracteres)`);
    }

    // 3. Construir historial y prompt
    const messages = (history || []).slice(-10).map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: message });

    const systemPrompt = SOPHIA_PROMPT + 
      `\n\nEl docente se llama ${context?.teacherName || 'Profesor/a'}.` +
      ragSection;

    // 4. Llamar a OpenAI
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const assistantMsg = response.choices[0].message.content;
    const usage = response.usage;

    // 5. Guardar respuesta asistente
    await turso.execute({
      sql: `INSERT INTO ai_chats (id, teacher_id, session_id, role, content, tokens_used, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, ?)`,
      args: [crypto.randomUUID(), req.user.id, session_id, assistantMsg, usage.total_tokens, now]
    });

    // 6. Log y retorno
    logAIUsage(req.user.id, 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'chat');

    res.json({
      success: true,
      session_id: session_id,
      content: assistantMsg,
      tokens_used: usage.total_tokens,
      model: 'gpt-4o',
      rag_active: !!ragContext
    });

  } catch (err) {
    logError('AI_CHAT_SOPHIA', err, { userId: req.user.id });
    res.status(500).json({ success: false, error: 'Error en Sophia IA', message: err.message });
  }
};

/**
 * LIST SESSIONS
 */
exports.listSessions = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT session_id,
                   MIN(created_at) as started_at,
                   MAX(created_at) as last_msg_at,
                   COUNT(*) as msg_count,
                   (SELECT content FROM ai_chats
                    WHERE teacher_id = t.teacher_id AND session_id = t.session_id AND role = 'user'
                    ORDER BY created_at ASC LIMIT 1) as first_user_msg
            FROM ai_chats t
            WHERE teacher_id = ?
            GROUP BY session_id
            ORDER BY last_msg_at DESC
            LIMIT 30`,
      args: [req.user.id]
    });
    res.json({ success: true, sessions: result.rows || [] });
  } catch (err) { next(err); }
};

/**
 * GET SESSION
 */
exports.getSession = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT id, role, content, created_at FROM ai_chats WHERE teacher_id = ? AND session_id = ? ORDER BY created_at ASC`,
      args: [req.user.id, req.params.session_id]
    });
    res.json({ success: true, session_id: req.params.session_id, messages: result.rows || [] });
  } catch (err) { next(err); }
};

/**
 * DELETE SESSION
 */
exports.deleteSession = async (req, res, next) => {
  try {
    await turso.execute({
      sql: `DELETE FROM ai_chats WHERE teacher_id = ? AND session_id = ?`,
      args: [req.user.id, req.params.session_id]
    });
    res.json({ success: true, message: 'Sesión eliminada' });
  } catch (err) { next(err); }
};

/**
 * DELETE ALL SESSIONS
 */
exports.deleteAllSessions = async (req, res, next) => {
  try {
    await turso.execute({
      sql: `DELETE FROM ai_chats WHERE teacher_id = ?`,
      args: [req.user.id]
    });
    res.json({ success: true, message: 'Historial limpio' });
  } catch (err) { next(err); }
};
