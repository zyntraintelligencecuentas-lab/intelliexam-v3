const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { turso } = require('../config/turso');
const crypto = require('crypto');
const { logger, logAIUsage, logError } = require('../middleware/logger');
const { PLANEACION_NEM_2022_PROMPT } = require('../prompts/planeacion-nem-2022');

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Ameyalli System Prompt ────────────────────────────────────────────────────
const AMEYALLI_PROMPT = `Eres Ameyalli, la asistente pedagógica inteligente de IntelliExam.

Tu nombre significa "manantial" en náhuatl — eres una fuente de conocimiento pedagógico cálida, confiable y profesional.

PERSONALIDAD:
- Amable, cálida y empática — entiendes el trabajo arduo de los docentes de **Primaria**.
- Profesional e inteligente — das respuestas precisas y bien fundamentadas en la NEM 2022.
- Proactiva — siempre sugieres acciones concretas, no solo información.
- Motivadora — celebras logros del grupo, apoyas en momentos difíciles.

CAPACIDADES Y ENFOQUE:
- Específicamente diseñada para **Educación Primaria** (Fases 3, 4 y 5).
- Analizas rendimiento de alumnos en tiempo real con los datos del grupo.
- Generas planes de clase NEM 2022 detallados y estructurados usando **PDA** (Procesos de Desarrollo de Aprendizaje).
- Creas preguntas de evaluación alineadas a los libros de texto gratuitos de la SEP.
- Produces planeaciones didácticas profundas enfocadas en la comunidad y el aula.

ALINEACIÓN CURRICULAR (ESTRICTA):
- Plan y Programas **NEM 2022** (Acuerdo 14/08/22).
- Uso obligatorio de **PDA** en lugar de "Aprendizajes Esperados" (obsoletos).
- Libros de texto gratuitos SEP (Primaria).
- Enfoque por campos formativos: Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario.

RESTRICCIONES:
- **RESTRICCIÓN DE NIVEL**: Solo genera contenido para **Educación Primaria**. Si se pide secundaria o preescolar, redirige amablemente hacia primaria.
- No inventes datos estadísticos que no estén en el contexto del grupo.
- Siempre mantén la privacidad de los alumnos.`;

// ── RAG SEP Query ─────────────────────────────────────────────────────────────
async function queryRAGSep(query) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logger.warn('RAG', 'Supabase no configurado — omitiendo contexto SEP');
    return null;
  }

  try {
    // Generar embedding del query con OpenAI
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      logger.warn('RAG', 'OpenAI API key no encontrada para embeddings');
      return null;
    }

    // Obtener embedding del query
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embedRes.ok) {
      logger.warn('RAG', `Error generando embedding: ${embedRes.status}`);
      return null;
    }

    const embedData = await embedRes.json();
    const embedding = embedData.data?.[0]?.embedding;
    if (!embedding) return null;

    // Consultar RAG SEP en Supabase
    const ragRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_sep_documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.75,
        match_count: 4,
      }),
    });

    if (!ragRes.ok) {
      logger.warn('RAG', `Error consultando Supabase: ${ragRes.status}`);
      return null;
    }

    const data = await ragRes.json();
    if (!Array.isArray(data)) {
      logger.warn('RAG', 'La respuesta de Supabase no es un array', { data });
      return null;
    }
    logger.info('RAG', `Se encontraron ${data.length} fragmentos relevantes.`);
    return data.map(d => d.content).join('\n\n');
  } catch (err) {
    logger.warn('RAG', `Error inesperado: ${err.message}`);
    return null;
  }
}

// ── Chat principal ────────────────────────────────────────────────────────────
exports.chat = async (teacherId, messages, context = {}) => {
  // Construir contexto del grupo
  let groupContext = '';
  if (context.students && context.students.length > 0) {
    const avgs    = context.students.filter(s => s.avg !== null).map(s => parseFloat(s.avg));
    const atRisk  = context.students.filter(s => (s.avg || 0) < 60).length;
    const groupAvg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '—';

    groupContext = `\n\n[DATOS DEL GRUPO EN TIEMPO REAL]\n` +
      `Total alumnos: ${context.students.length}\n` +
      `Promedio grupal: ${groupAvg}%\n` +
      `Alumnos en riesgo (<60%): ${atRisk}\n` +
      `Alumnos con buen desempeño (≥80%): ${context.students.filter(s => (s.avg || 0) >= 80).length}`;
  }

  // Consultar RAG SEP con el último mensaje del usuario
  const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const ragContext = await queryRAGSep(lastUserMsg);

  let ragSection = '';
  if (ragContext) {
    ragSection = `\n\n[CONTEXTO DE LIBROS SEP — usa esta información para enriquecer tu respuesta]\n${ragContext}`;
  }

  const systemFull = AMEYALLI_PROMPT + groupContext + ragSection;

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemFull },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ],
    max_tokens: 2048,
  });

  const content      = response.choices[0].message.content;
  const usage        = response.usage;
  const msgId        = crypto.randomUUID();
  const sessionId    = context.sessionId || crypto.randomUUID();
  const isNewSession = !context.sessionId;

  // Log de uso de IA
  logAIUsage(teacherId, 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'chat');

  // Persistir en Turso (User message)
  try {
    await turso.execute({
      sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used, session_id, topic) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING`,
      args: [
        crypto.randomUUID(), 
        teacherId, 
        'user', 
        lastUserMsg || '(sin contenido)', 
        usage.prompt_tokens, 
        sessionId, 
        isNewSession ? (lastUserMsg ? lastUserMsg.substring(0, 45) + '...' : 'Nueva sesión') : null
      ],
    });
  } catch (dbErr) {
    logError('DB-CHAT-USER', dbErr, { teacherId, sessionId });
  }

  // Persistir en Turso (AI response)
  try {
    await turso.execute({
      sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used, session_id) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [msgId, teacherId, 'assistant', content, usage.completion_tokens, sessionId],
    });
  } catch (dbErr) {
    logError('DB-CHAT-AI', dbErr, { teacherId, sessionId });
  }

  return { content, tokens_used: usage.total_tokens, session_id: sessionId };
};

// ── Historial de chats ────────────────────────────────────────────────────────
exports.getChatHistory = async (teacherId, limit = 50) => {
  try {
    const result = await turso.execute({
      sql: `SELECT id, role, content, tokens_used, session_id, created_at
            FROM ai_chats
            WHERE teacher_id = ?
            ORDER BY created_at ASC
            LIMIT ?`,
      args: [teacherId, limit],
    });

    return result.rows || [];
  } catch (err) {
    logError('AI', err, { teacherId, category: 'history' });
    return [];
  }
};

// ── Listar sesiones de chat ───────────────────────────────────────────────────
exports.listChatSessions = async (teacherId) => {
  try {
    const result = await turso.execute({
      sql: `SELECT session_id,
                   MIN(created_at) as started_at,
                   MAX(created_at) as last_msg_at,
                   COUNT(*) as msg_count,
                   (SELECT content FROM ai_chats
                    WHERE teacher_id = ? AND session_id = t.session_id AND role = 'user'
                    ORDER BY created_at ASC LIMIT 1) as first_user_msg,
                   (SELECT topic FROM ai_chats
                    WHERE teacher_id = ? AND session_id = t.session_id AND topic IS NOT NULL
                    ORDER BY created_at ASC LIMIT 1) as session_topic
            FROM ai_chats t
            WHERE teacher_id = ?
            GROUP BY session_id
            ORDER BY last_msg_at DESC
            LIMIT 40`,
      args: [teacherId, teacherId, teacherId],
    });

    return (result.rows || []).map(r => ({
      ...r,
      first_user_msg: r.session_topic || r.first_user_msg || 'Conversación vacía'
    }));
  } catch (err) {
    logError('AI-SESSIONS', err, { teacherId });
    return [];
  }
};

// ── Eliminar sesión de chat ───────────────────────────────────────────────────
exports.deleteChatSession = async (teacherId, sessionId) => {
  await turso.execute({
    sql: `DELETE FROM ai_chats WHERE teacher_id = ? AND session_id = ?`,
    args: [teacherId, sessionId],
  });
  return { deleted: true };
};

// ── Generar planeación completa (+15k chars) ──────────────────────────────────
exports.generatePlaneacion = async (teacherId, params) => {
  const { materia, grado, tema, duracion = '50 minutos', semanas = 1 } = params;

  // Prompt estructurado para NEM 2022
  const prompt = `Actúa como un experto en Pedagogía Crítica y la Nueva Escuela Mexicana (NEM 2022). 
Genera una planeación didáctica profesional para:
- Materia: ${materia}
- Grado: ${grado}
- Tema: ${tema}
- Duración por sesión: ${duracion}
- Periodo: ${semanas} semana(s)

La planeación DEBE incluir los siguientes apartados obligatorios:
1. CAMPO FORMATIVO Y EJES ARTICULADORES.
2. PROCESOS DE DESARROLLO DE APRENDIZAJE (PDA) - Basados en el programa sintético actual.
3. METODOLOGÍA (Indicar si es Proyectos, STEAM, Aprendizaje Servicio o Problemas).
4. SECUENCIA DIDÁCTICA DETALLADA (Inicio, Desarrollo, Cierre por sesión).
5. ESTRATEGIAS DE EVALUACIÓN FORMATIVA (Rúbricas, listas de cotejo, etc.).
6. VINCULACIÓN CON LA COMUNIDAD.

Usa un tono profesional, experto y accionable. Devuelve el contenido en formato Markdown estructurado.`;

  const ragContext = await queryRAGSep(`${materia} ${tema} ${grado} planeación SEP NEM 2022`);

  let systemWithRag = AMEYALLI_PROMPT;
  if (ragContext) {
    systemWithRag += `\n\n[CONOCIMIENTO SEP (USA ESTO)]\n${ragContext}`;
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    const usage = response.usage;

    // Persistir planeación
    try {
      await turso.execute({
        sql: `INSERT INTO planeaciones (id, teacher_id, materia, grado, tema, content, tokens_used)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), teacherId, materia, grado, tema, content, usage.total_tokens]
      });
    } catch (dbErr) {
      logError('DB-PLANNING', dbErr, { teacherId, materia, tema });
    }

    logAIUsage(teacherId, 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'planeacion');
    return { 
      success: true,
      content, 
      tokens_used: usage.total_tokens, 
      materia, tema, grado 
    };
  } catch (err) {
    logError('AI_PLANNING', err, { teacherId, materia, tema });
    throw err;
  }
};

// ── Generar Examen (con RAG) ──────────────────────────────────────────────────
exports.generateExam = async (params) => {
  const { title, subject, group_name, total_items, examType } = params;

  const prompt = `Eres Ameyalli, la asistente pedagógica experta de IntelliExam.
Genera un examen estructurado sobre la materia de ${subject} con el tema "${title}". 
Debe contener exactamente ${total_items || 20} preguntas.
El tipo de examen requerido es: **${examType || 'Opción Múltiple'}**.

Adapta el formato de las preguntas a ese tipo (ej. si es "Casos Prácticos", pon casos; si es "Mixto", incluye de todo; si es "Preguntas Abiertas", deja espacio para responder).

Formato General Sugerido:
=============================
EXAMEN DE ${subject.toUpperCase()}
Tema: ${title}
Tipo: ${examType || 'Opción Múltiple'}
=============================

Escribe las preguntas claramente numeradas. Devuelve solo el texto del examen listo para imprimirse o guardarse en Word, sin saludos introductorios.
`;

  const ragContext = await queryRAGSep(`${subject} ${title} preguntas examen evaluación primaria secundaria SEP NEM`);

  let systemWithRag = AMEYALLI_PROMPT;
  if (ragContext) {
    systemWithRag += `\n\n[CONTEXTO DE LIBROS SEP - Usa esta información para formular las preguntas del examen]\n${ragContext}`;
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o', 
      messages: [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2500,
    });

    const content = response.choices[0].message?.content || 'Error: No se generó contenido.';
    const usage = response.usage;
    
    logAIUsage(params.teacherId || 'unknown', 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'exam');
    
    return { content };
  } catch (err) {
    logError('AI', err, { feature: 'exam', title, subject });
    throw new Error('Error al generar examen con OpenAI: ' + err.message);
  }
};
