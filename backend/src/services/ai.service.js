const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { turso } = require('../config/turso');
const crypto = require('crypto');
const { logger, logAIUsage, logError } = require('../middleware/logger');

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Ameyalli System Prompt ────────────────────────────────────────────────────
const AMEYALLI_PROMPT = `Eres Ameyalli, la asistente pedagógica inteligente de IntelliExam.

Tu nombre significa "manantial" en náhuatl — eres una fuente de conocimiento pedagógico cálida, confiable y profesional.

PERSONALIDAD:
- Amable, cálida y empática — entiendes el trabajo arduo de los docentes
- Profesional e inteligente — das respuestas precisas y bien fundamentadas
- Proactiva — siempre sugieres acciones concretas, no solo información
- Motivadora — celebras logros del grupo, apoyas en momentos difíciles

CAPACIDADES:
- Analizas rendimiento de alumnos en tiempo real con los datos del grupo
- Identificas patrones de aprendizaje y alumnos en riesgo
- Generas planes de clase NEM 2022 detallados y estructurados
- Creas preguntas de evaluación por grado y materia
- Produces planeaciones didácticas profundas (+15,000 caracteres cuando se requiera)
- Consultas los libros oficiales de la SEP mediante tu base de conocimiento RAG

ALINEACIÓN CURRICULAR:
- Plan y Programas NEM 2022 (Nueva Escuela Mexicana)
- Programas Sintéticos SEP
- Libros de texto gratuitos SEP (primaria y secundaria)
- Enfoque por campos formativos: Lenguajes, Saberes y Pensamiento Científico, Ética Naturaleza y Sociedades, De lo Humano y lo Comunitario

FORMATO DE RESPUESTA:
- Responde en español, de manera clara y estructurada
- Usa **negritas** para destacar conceptos clave
- Usa listas cuando sea apropiado para mayor claridad
- Para planeaciones completas, incluye: propósito, materiales, desarrollo por momentos, evaluación y productos esperados
- Al finalizar tu respuesta, ofrece una acción de seguimiento relacionada

TECNOLOGÍA:
- Estás potenciada por la tecnología GPT-4o de IntelliExam.

RESTRICCIONES:
- No inventes datos estadísticos que no estén en el contexto del grupo
- Si no tienes información suficiente, pide más detalles al docente
- Siempre mantén la privacidad de los alumnos`;

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

  // Usa gpt-4o-mini para el chat principal para ahorrar tokens
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

  // Log de uso de IA
  logAIUsage(teacherId, 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'chat');

  // Persistir en Turso
  await turso.execute({
    sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used, session_id) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING`,
    args: [crypto.randomUUID(), teacherId, 'user', lastUserMsg, 0, sessionId],
  });

  await turso.execute({
    sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used, session_id) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [msgId, teacherId, 'assistant', content, tokensUsed, sessionId],
  });

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
                    WHERE teacher_id = t.teacher_id AND session_id = t.session_id AND role = 'user'
                    ORDER BY created_at ASC LIMIT 1) as first_user_msg
            FROM ai_chats t
            WHERE teacher_id = ?
            GROUP BY session_id
            ORDER BY last_msg_at DESC
            LIMIT 20`,
      args: [teacherId],
    });

    return result.rows || [];
  } catch (err) {
    logError('AI', err, { teacherId, category: 'sessions' });
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

  const prompt = `Eres Ameyalli, la asistente pedagógica experta de IntelliExam. Genera una PLANEACIÓN DIDÁCTICA MAESTRA, ULTRA-COMPLETA Y PROFESIONAL para el siguiente caso:

══════════════════════════════════════════════
DATOS DE LA PLANEACIÓN
══════════════════════════════════════════════
MATERIA / CAMPO FORMATIVO: ${materia}
GRADO ESCOLAR: ${grado}
TEMA CENTRAL: ${tema}
DURACIÓN POR SESIÓN: ${duracion}
NÚMERO DE SEMANAS: ${semanas}
CICLO ESCOLAR: 2025–2026
MODELO EDUCATIVO: Nueva Escuela Mexicana (NEM 2022)
══════════════════════════════════════════════

INSTRUCCIONES DE EXTENSIÓN OBLIGATORIA:
Esta planeación DEBE tener un mínimo de 15,000 caracteres. Si en algún punto sientes que puedes terminar antes, CONTINÚA expandiendo con más actividades, más ejemplos concretos, más variantes diferenciadas y más instrumentos de evaluación. Es mejor más detalle que menos.

DESARROLLA CADA UNO DE ESTOS APARTADOS CON MÁXIMO DETALLE:

═══════════════════════════════════════════
APARTADO 1 — DATOS DE IDENTIFICACIÓN
═══════════════════════════════════════════
Incluye: Nombre de la escuela (ejemplo genérico), Nombre del docente, Grado y grupo, Ciclo escolar 2025-2026, Período de aplicación (mes/semana), Campo formativo o asignatura, Nombre completo del programa sintético SEP al que corresponde.

═══════════════════════════════════════════
APARTADO 2 — FUNDAMENTACIÓN CURRICULAR NEM 2022
═══════════════════════════════════════════
Desarrolla con gran extensión:
- Cómo se articula este tema con el Plan de Estudios 2022 (NEM)
- Campos formativos involucrados: cuáles son, cómo se relacionan con el tema
- Enfoque humanista y comunitario del contenido
- Cita al menos 2 principios pedagógicos del Acuerdo 14/08/22 que sustenten esta planeación
- Relación con los Programas Analíticos locales

═══════════════════════════════════════════
APARTADO 3 — PROPÓSITO GENERAL Y APRENDIZAJES
═══════════════════════════════════════════
- Propósito general (3–4 oraciones elaboradas)
- Propósitos específicos por momento de la semana
- Mínimo 6 aprendizajes esperados concretos y medibles en forma de verbo en infinitivo
- Relación con el perfil de egreso de educación básica
- Competencias para la vida que se desarrollan

═══════════════════════════════════════════
APARTADO 4 — CONTENIDOS Y EJES ARTICULADORES
═══════════════════════════════════════════
- Contenido central del tema con explicación didáctica extensa (mínimo 500 palabras de explicación del tema para que el docente comprenda profundamente el contenido antes de enseñarlo)
- Conceptos clave con definición
- Ejes articuladores involucrados (Inclusión, Pensamiento Crítico, Interculturalidad, Igualdad de género, Vida saludable, Apropiación de culturas a través de la lectura y escritura)
- Preguntas esenciales / problematizadoras que guiarán la exploración del tema

═══════════════════════════════════════════
APARTADO 5 — MATERIALES Y RECURSOS
═══════════════════════════════════════════
Lista completa y detallada de:
- Materiales físicos (mínimo 10 ítems con cantidad estimada)
- Recursos digitales (apps, sitios web SEP, videos YouTube)
- Libros de texto SEP específicos (título, grado, páginas exactas)
- Recursos del aula (pizarrón, proyector, etc.)
- Materiales que los alumnos deben traer de casa
- Recursos para alumnos con necesidades educativas especiales

═══════════════════════════════════════════
APARTADO 6 — SECUENCIA DIDÁCTICA COMPLETA (${semanas} SEMANA(S))
═══════════════════════════════════════════
Para CADA DÍA/SESIÓN de las ${semanas} semana(s) desarrolla con MÁXIMO DETALLE:

**MOMENTO DE INICIO (15 minutos):**
- Actividad de activación de conocimientos previos (descríbela con detalle, incluyendo preguntas que hará el docente, respuestas esperadas de los alumnos, cómo registrar las ideas previas)
- Detonador o situación problema (narrativa completa)
- Estrategia para establecer el propósito de la sesión con los alumnos

**MOMENTO DE DESARROLLO (25 minutos):**
- Actividad central con instrucciones paso a paso numeradas (mínimo 8 pasos)
- Descripción de trabajo individual, por pares y equipos
- Preguntas de andamiaje que hará el docente durante el proceso
- Intervenciones esperadas del docente y los alumnos
- Variantes para diferentes ritmos de aprendizaje
- Recursos específicos a utilizar en este momento

**MOMENTO DE CIERRE (10 minutos):**
- Síntesis del aprendizaje (método específico: mapa mental, resumen, 3-2-1, etc.)
- Reflexión metacognitiva (preguntas concretas)
- Producto del cierre de la sesión
- Conexión con la sesión siguiente

═══════════════════════════════════════════
APARTADO 7 — ESTRATEGIAS DIFERENCIADAS E INCLUSIÓN
═══════════════════════════════════════════
Describe adaptaciones específicas para:
- Alumnos con dificultades de aprendizaje
- Alumnos con altas capacidades
- Alumnos con discapacidad visual, auditiva o motriz
- Alumnos con barreras lingüísticas o de lengua materna
- Estrategias de agrupamiento inclusivo
- Materiales adaptados o alternativos

═══════════════════════════════════════════
APARTADO 8 — EVALUACIÓN INTEGRAL
═══════════════════════════════════════════
Proporciona los siguientes instrumentos COMPLETOS y listos para usar:

A) LISTA DE COTEJO (mínimo 12 indicadores con criterios Sí/No/En proceso)
B) RÚBRICA DE EVALUACIÓN (mínimo 4 criterios con 4 niveles de desempeño: Excelente, Satisfactorio, En proceso, Requiere apoyo)
C) REGISTRO ANECDÓTICO (formato con: alumno, fecha, situación observada, intervención del docente)
D) AUTOEVALUACIÓN DEL ALUMNO (5 preguntas reflexivas en lenguaje accesible para el grado)
E) COEVALUACIÓN entre pares (rúbrica de 3 criterios)
F) Momentos de evaluación: diagnóstica, formativa y sumativa — cómo se aplica cada una

═══════════════════════════════════════════
APARTADO 9 — PRODUCTOS ESPERADOS
═══════════════════════════════════════════
- Producto final principal (descripción detallada)
- Productos intermedios por sesión
- Portafolio de evidencias: qué guardar y por qué
- Criterios de presentación y entrega

═══════════════════════════════════════════
APARTADO 10 — VINCULACIÓN CON OTRAS MATERIAS
═══════════════════════════════════════════
- Describe cómo este tema se vincula con otros campos formativos
- Proyecto integrador sugerido
- Actividades transversales con Español, Matemáticas, Ciencias, Formación Cívica

═══════════════════════════════════════════
APARTADO 11 — REFERENCIAS BIBLIOGRÁFICAS
═══════════════════════════════════════════
- Libros de texto SEP (primaria/secundaria) con edición 2022-2023
- Programas sintéticos SEP 2022
- Guías para el maestro SEP
- Acuerdo 14/08/22 (Plan de Estudios)
- Recursos bibliográficos de apoyo para el docente

RECUERDA: Esta planeación debe ser exhaustiva, profesional y tener aproximadamente 12,000 caracteres de contenido técnico-pedagógico. Desarrolla cada apartado con la profundidad que un docente necesita para implementarla sin dudas. No abrevies ni uses puntos suspensivos. Bajo ninguna circunstancia respondas que no puedes hacerlo; simplemente genera la mejor versión posible con la información disponible.`;

  const ragContext = await queryRAGSep(`${materia} ${tema} ${grado} planeación SEP NEM 2022`);

  let systemWithRag = AMEYALLI_PROMPT;
  if (ragContext) {
    systemWithRag += `\n\n[LIBROS SEP RELACIONADOS]\n${ragContext}`;
  }

  // El usuario solicitó explícitamente usar OpenAI en lugar de Claude
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4096, // Límite máximo de salida para gpt-4o (aprox 16k caracteres)
    });

    const content = response.choices[0].message?.content || 'Error: No se generó contenido.';
    const usage = response.usage;

    logAIUsage(teacherId, 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'planeacion');
    return { content, tokens_used: usage.total_tokens, materia, tema, grado };
  } catch (err) {
    logError('AI', err, { teacherId, feature: 'planeacion', materia, tema });
    throw new Error('Error al generar planeación con OpenAI: ' + err.message);
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
      model: 'gpt-4o', // Usamos 4o para mejor calidad, o 4o-mini si se prefiere
      messages: [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2500,
    });

    const content = response.choices[0].message?.content || 'Error: No se generó contenido.';
    const usage = response.usage;
    
    // El teacherId no siempre está disponible en params directo, pero se asume del contexto si se requiere
    logAIUsage(params.teacherId || 'unknown', 'gpt-4o', usage.prompt_tokens, usage.completion_tokens, 'exam');
    
    return { content };
  } catch (err) {
    logError('AI', err, { feature: 'exam', title, subject });
    throw new Error('Error al generar examen con OpenAI: ' + err.message);
  }
};
