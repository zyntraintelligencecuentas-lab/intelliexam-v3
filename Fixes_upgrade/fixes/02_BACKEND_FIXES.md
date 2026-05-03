# 🔧 BACKEND FIXES — Instrucciones para Antigravity
**Rol**: Tú eres el programador. Ejecuta cada fix en orden exacto.  
**NO cambies** lo que no está listado aquí.  
**SÍ escribe** el código exactamente como se indica.

---

## FIX-01 · Migrar IA de OpenAI → Claude (CRÍTICO)

**Archivo a modificar**: `src/services/ai.service.js`

### Paso 1: Cambiar imports al inicio del archivo

**REEMPLAZA** estas líneas:
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { turso } = require('../config/turso');
const crypto = require('crypto');

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**CON**:
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const { turso } = require('../config/turso');
const crypto = require('crypto');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
```

---

### Paso 2: Reemplazar la función `exports.chat`

**REEMPLAZA** el bloque `// ── Chat principal ──` completo con:

```javascript
exports.chat = async (teacherId, messages, context = {}) => {
  let groupContext = '';
  if (context.students && context.students.length > 0) {
    const avgs   = context.students.filter(s => s.avg !== null).map(s => parseFloat(s.avg));
    const atRisk = context.students.filter(s => (s.avg || 0) < 60).length;
    const groupAvg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '—';

    groupContext = `\n\n[DATOS DEL GRUPO EN TIEMPO REAL]\n` +
      `Total alumnos: ${context.students.length}\n` +
      `Promedio grupal: ${groupAvg}%\n` +
      `Alumnos en riesgo (<60%): ${atRisk}\n` +
      `Alumnos con buen desempeño (≥80%): ${context.students.filter(s => (s.avg || 0) >= 80).length}`;
  }

  const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const ragContext  = await queryRAGSep(lastUserMsg);
  let ragSection    = '';
  if (ragContext) {
    ragSection = `\n\n[CONTEXTO DE LIBROS SEP]\n${ragContext}`;
  }

  const systemFull = AMEYALLI_PROMPT + groupContext + ragSection;
  const sessionId  = context.sessionId || crypto.randomUUID();

  // Formatear mensajes para Claude (sin system en el array)
  const claudeMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemFull,
    messages: claudeMessages,
  });

  const content    = response.content[0].text;
  const inputTok   = response.usage.input_tokens;
  const outputTok  = response.usage.output_tokens;
  const tokensUsed = inputTok + outputTok;

  // Persistir en Turso
  await turso.execute({
    sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used, session_id, model)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), teacherId, 'user', lastUserMsg, 0, sessionId, CLAUDE_MODEL],
  });

  await turso.execute({
    sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used, session_id, model)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), teacherId, 'assistant', content, tokensUsed, sessionId, CLAUDE_MODEL],
  });

  return { content, tokens_used: tokensUsed, session_id: sessionId };
};
```

---

### Paso 3: Reemplazar `generatePlaneacion` para usar Claude

**REEMPLAZA** el bloque de `exports.generatePlaneacion` completo.  
**Cambia SOLO** la llamada a la API — mantén el prompt largo igual.

Busca este bloque al final de `generatePlaneacion`:
```javascript
  // El usuario solicitó explícitamente usar OpenAI en lugar de Claude
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemWithRag },
        { role: 'user', content: prompt }
      ],
      max_tokens: 16000,
    });

    const content = response.choices[0].message.content;
    const tokensUsed = response.usage.total_tokens;

    return { content, tokens_used: tokensUsed, materia, tema, grado };
  } catch (err) {
    console.error('[AI Planeacion Error]:', err);
    throw new Error('Error al generar planeación con OpenAI: ' + err.message);
  }
```

**REEMPLAZA CON**:
```javascript
  try {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: systemWithRag,
      messages: [{ role: 'user', content: prompt }],
    });

    const content    = response.content[0].text;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return { content, tokens_used: tokensUsed, materia, tema, grado };
  } catch (err) {
    console.error('[AI Planeacion Error]:', err);
    throw new Error('Error al generar planeación: ' + err.message);
  }
```

---

### Paso 4: Limpiar imports de OpenAI en otros archivos

**Archivo**: `src/controllers/exams.controller.js`

Busca este bloque dentro de `exports.create`:
```javascript
    let ai_content = '';
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**REEMPLAZA** la instanciación con Claude:
```javascript
    let ai_content = '';
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

Busca dentro del mismo bloque:
```javascript
      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      });
      ai_content = aiRes.choices[0].message.content;
```

**REEMPLAZA CON**:
```javascript
      const aiRes = await claude.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      ai_content = aiRes.content[0].text;
```

**Archivo**: `src/controllers/reports.controller.js`

Busca dentro de `getStudentReport`:
```javascript
        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const prompt = `...`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        });
        ai_feedback = response.choices[0].message.content;
```

**REEMPLAZA CON**:
```javascript
        const Anthropic = require('@anthropic-ai/sdk');
        const claude    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        
        const prompt = `Eres Ameyalli, asistente pedagógica. 
El alumno ${student.name} tiene un promedio de ${student.avg}% en ${student.exams_count} exámenes.
Sus calificaciones recientes son: ${scores.slice(0,3).join(', ')}.
Notas del docente: ${student.notes || 'Ninguna'}.
Genera un mini-feedback (máximo 3 oraciones) cálido y profesional sobre su estado.`;

        const response = await claude.messages.create({
          model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        });
        ai_feedback = response.content[0].text;
```

---

## FIX-02 · Crear endpoint `/api/dashboard` (CRÍTICO)

**Crea el archivo**: `src/routes/dashboard.routes.js`

```javascript
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { turso }       = require('../config/turso');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    // Ejecutar queries en paralelo
    const [studentsRes, examsRes, profileRes] = await Promise.all([
      turso.execute({
        sql: `SELECT s.*, 
                ROUND(AVG(er.score), 1) as avg,
                COUNT(er.id) as exams_count,
                (SELECT er2.score FROM exam_results er2 
                 WHERE er2.student_id = s.id 
                 ORDER BY er2.created_at DESC LIMIT 1) as last_score,
                (SELECT er3.score FROM exam_results er3 
                 WHERE er3.student_id = s.id 
                 ORDER BY er3.created_at DESC LIMIT 1 OFFSET 1) as prev_score
              FROM students s
              LEFT JOIN exam_results er ON s.id = er.student_id
              WHERE s.teacher_id = ? AND s.status != 'deleted'
              GROUP BY s.id
              ORDER BY s.list_number ASC`,
        args: [teacherId],
      }),
      turso.execute({
        sql: `SELECT e.*,
                ROUND(AVG(er.score), 1) as avg_score,
                COUNT(er.id) as results_count
              FROM exams e
              LEFT JOIN exam_results er ON e.id = er.exam_id
              WHERE e.teacher_id = ?
              GROUP BY e.id
              ORDER BY e.created_at DESC
              LIMIT 20`,
        args: [teacherId],
      }),
      turso.execute({
        sql: `SELECT full_name, school, grade, group_name, plan FROM profiles WHERE id = ?`,
        args: [teacherId],
      }),
    ]);

    const students = studentsRes.rows || [];
    const exams    = examsRes.rows || [];
    const profile  = profileRes.rows[0] || {};

    // Calcular KPIs
    const allAvgs    = students.filter(s => s.avg !== null).map(s => parseFloat(s.avg));
    const groupAvg   = allAvgs.length
      ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1)
      : 0;
    const atRisk     = students.filter(s => (s.avg || 0) < 60).length;
    const watching   = students.filter(s => (s.avg || 0) >= 60 && (s.avg || 0) < 70).length;

    // Tema crítico: materia del examen más reciente con avg más bajo
    const criticalExam = [...exams]
      .filter(e => e.avg_score !== null)
      .sort((a, b) => (a.avg_score || 100) - (b.avg_score || 100))[0];

    res.json({
      profile,
      students: students.map(s => ({
        ...s,
        trend: s.last_score !== null && s.prev_score !== null
          ? (parseFloat(s.last_score) - parseFloat(s.prev_score)).toFixed(1)
          : '0',
        status: (s.avg || 0) >= 70 ? 'ok' : (s.avg || 0) >= 60 ? 'watch' : 'risk',
      })),
      exams,
      stats: {
        total_students: students.length,
        total_exams:    exams.length,
        group_avg:      parseFloat(groupAvg),
        at_risk:        atRisk,
        watching,
        top_student:    students.sort((a, b) => (b.avg || 0) - (a.avg || 0))[0] || null,
        critical_subject: criticalExam ? {
          subject:  criticalExam.subject,
          avg:      criticalExam.avg_score,
          exam_id:  criticalExam.id,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

**Registra la ruta en `server.js`**:

Agrega después de las importaciones de rutas existentes:
```javascript
const dashboardRoutes = require('./src/routes/dashboard.routes');
```

Agrega después de `app.use('/api/ai', aiRoutes);`:
```javascript
app.use('/api/dashboard', dashboardRoutes);
```

---

## FIX-03 · Corregir typo `fronted` → `frontend`

**Archivo**: `server.js`

**REEMPLAZA**:
```javascript
app.use(express.static(path.join(__dirname, '../fronted')));
// ...
res.sendFile(path.join(__dirname, '../fronted/login.html'));
```

**CON** (ajusta según el nombre real de tu carpeta de frontend):
```javascript
app.use(express.static(path.join(__dirname, '../frontend')));
// ...
res.sendFile(path.join(__dirname, '../frontend/login.html'));
```

> ⚠️ **Confirma primero** cómo se llama la carpeta real del frontend con `ls ../` y ajusta.

---

## FIX-04 · Migrar passwords a bcrypt

**Archivo**: `src/controllers/auth.controller.js`

### Paso 1: Agregar bcrypt al inicio del archivo

**REEMPLAZA**:
```javascript
const { turso } = require('../config/turso');
const crypto = require('crypto');
```

**CON**:
```javascript
const { turso }  = require('../config/turso');
const crypto     = require('crypto');
const bcrypt     = require('bcrypt');
const SALT_ROUNDS = 12;
```

### Paso 2: Actualizar `register` — hashing

**REEMPLAZA**:
```javascript
const hashedPwd = crypto.createHash('sha256').update(password).digest('hex');
```

**CON**:
```javascript
const hashedPwd = await bcrypt.hash(password, SALT_ROUNDS);
```

### Paso 3: Actualizar `login` — comparación

**REEMPLAZA**:
```javascript
const hashedPwd = crypto.createHash('sha256').update(password).digest('hex');

const result = await turso.execute({ ... });

if (!result.rows.length || result.rows[0].password_hash !== hashedPwd) {
```

**CON**:
```javascript
const result = await turso.execute({ ... });

if (!result.rows.length) {
  return res.status(401).json({ error: 'Credenciales incorrectas' });
}

const passwordMatch = await bcrypt.compare(password, result.rows[0].password_hash);
if (!passwordMatch) {
```

> ⚠️ **NOTA**: Los usuarios existentes con hash SHA-256 deberán resetear su contraseña. El usuario demo en el schema usa SHA-256. Después del fix, regístralo de nuevo o actualiza su hash.

---

## FIX-05 · Actualizar `.env` con modelo Claude

**Agrega** al final del archivo `.env`:
```env
CLAUDE_MODEL=claude-sonnet-4-20250514
```

> ⚠️ **No expongas** el `.env` en GitHub. Verifica que `.gitignore` lo incluye.

---

## FIX-06 · Verificar `session_id` en Turso

**Ejecuta** este SQL en el shell de Turso:
```bash
turso db shell intelliexam-zyntraintelligencecuentas-lab
```

```sql
-- Verificar si session_id existe
PRAGMA table_info(ai_chats);

-- Si NO aparece session_id, ejecutar:
ALTER TABLE ai_chats ADD COLUMN session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_chats_session ON ai_chats(teacher_id, session_id);

-- Verificar que el campo model existe en ai_chats
-- Si no existe:
ALTER TABLE ai_chats ADD COLUMN model TEXT DEFAULT 'claude-sonnet-4-20250514';
```

---

## FIX-07 · Corregir CORS para frontend v4

**Archivo**: `server.js`

**REEMPLAZA**:
```javascript
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**CON**:
```javascript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origen no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Actualiza `.env`**:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:5500
```

---

## FIX-08 · Aumentar límite AI para desarrollo

**Archivo**: `src/middleware/rateLimiter.js`

**REEMPLAZA**:
```javascript
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Límite de consultas IA (20/hora)' },
});
```

**CON**:
```javascript
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 200 : 30,
  message: { error: 'Límite de consultas IA alcanzado' },
});
```

---

## ORDEN DE EJECUCIÓN PARA ANTIGRAVITY

```
1. FIX-05 → Actualizar .env con CLAUDE_MODEL
2. FIX-06 → Verificar session_id en Turso  
3. FIX-01 → Migrar IA de OpenAI a Claude (ai.service.js + exams + reports)
4. FIX-02 → Crear dashboard.routes.js + registrar en server.js
5. FIX-03 → Corregir typo fronted/frontend en server.js
6. FIX-07 → Corregir CORS en server.js
7. FIX-04 → Migrar bcrypt (opcional si no quieres romper usuarios existentes)
8. FIX-08 → Rate limit más permisivo en dev

Después de cada fix: npm run dev y verificar que no crashea.
```

---

## ✅ VERIFICACIÓN POST-FIX

```bash
# 1. El servidor inicia sin errores
npm run dev

# 2. Health check
curl http://localhost:3001/api/health

# 3. Login con usuario demo
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@intelliexam.com","password":"Demo1234"}'
# Esperado: {"user":{...},"access_token":"eyJ..."}

# 4. Dashboard (con el token del paso anterior)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3001/api/dashboard
# Esperado: {"profile":{...},"students":[...],"exams":[...],"stats":{...}}

# 5. Chat con Ameyalli
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"message":"Hola Ameyalli","history":[]}'
# Esperado: {"content":"Hola...","tokens_used":...,"session_id":"..."}
```
