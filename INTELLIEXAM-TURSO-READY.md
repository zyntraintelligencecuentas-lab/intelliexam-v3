# INTELLIEXAM v3 · Backend Completo con TURSO
## Instrucciones para Claude Code Terminal

**Pre-requisitos listos:**
- ✅ TURSO_CONNECTION_URL: `libsql://intelliexam-xxxxx.turso.io`
- ✅ TURSO_AUTH_TOKEN: `eyJhbGc...`
- ✅ ANTHROPIC_API_KEY: `sk-ant-...`
- ✅ Node.js 20+

---

## INSTRUCCIONES PARA CLAUDE CODE

Ejecuta esto en tu terminal:

```bash
cd C:\Users\zyntr\Projects\intelliexam-v3\backend
claude
```

Pega este prompt exactamente:

```
ROLE: Eres arquitecto backend senior para IntelliExam.

INSTRUCCIONES:
1. Lee la skill en: C:\Users\zyntr\Projects\.claude\Controldegastos\impeccable-main
2. Crea EXACTAMENTE esta estructura:

backend/
├── src/
│   ├── config/
│   │   ├── turso.js
│   │   └── env.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── students.routes.js
│   │   ├── exams.routes.js
│   │   ├── scan.routes.js
│   │   ├── reports.routes.js
│   │   └── ai.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── students.controller.js
│   │   ├── exams.controller.js
│   │   ├── scan.controller.js
│   │   ├── reports.controller.js
│   │   └── ai.controller.js
│   ├── services/
│   │   ├── ocr.service.js
│   │   ├── ai.service.js
│   │   └── pdf.service.js
│   └── utils/
│       ├── validators.js
│       └── formatters.js
├── uploads/
├── .env (el usuario lo llenará)
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README-LOCAL.md

3. INSTALA ESTAS DEPENDENCIAS EN ORDEN:
npm init -y
npm install express cors helmet dotenv morgan
npm install @libsql/client
npm install jsonwebtoken express-rate-limit express-validator
npm install multer
npm install tesseract.js
npm install @anthropic-ai/sdk
npm install --save-dev nodemon

4. GENERA TODOS LOS ARCHIVOS COMPLETOS (ver detalles abajo)

5. NO ejecutes npm run dev aún - el usuario llenará el .env primero
```

---

## ARCHIVOS A CREAR (Copiar tal cual)

### 1. backend/server.js
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.routes');
const studentRoutes = require('./src/routes/students.routes');
const examRoutes = require('./src/routes/exams.routes');
const scanRoutes = require('./src/routes/scan.routes');
const reportRoutes = require('./src/routes/reports.routes');
const aiRoutes = require('./src/routes/ai.routes');

const errorHandler = require('./src/middleware/errorHandler');
const { globalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    db: 'TURSO',
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log('\n══════════════════════════════════════');
  console.log(`  IntelliExam Backend v3.0`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Entorno: ${process.env.NODE_ENV}`);
  console.log(`  Base de datos: TURSO`);
  console.log('══════════════════════════════════════\n');
});

module.exports = app;
```

### 2. backend/src/config/turso.js
```javascript
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Test connection
turso.execute('SELECT 1').catch(err => {
  console.error('[TURSO] Error de conexión:', err.message);
  process.exit(1);
});

module.exports = { turso };
```

### 3. backend/src/config/env.js
```javascript
const required = [
  'TURSO_CONNECTION_URL',
  'TURSO_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'JWT_SECRET',
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ Variables de entorno faltantes:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nCopia las variables en backend/.env\n');
  process.exit(1);
}

module.exports = { validated: true };
```

### 4. backend/src/middleware/auth.js
```javascript
const crypto = require('crypto');

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const [headerB64, payloadB64, signatureB64] = token.split('.');

    if (!headerB64 || !payloadB64 || !signatureB64) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const secret = process.env.JWT_SECRET;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    if (signatureB64 !== expectedSig) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Token expirado' });
    }

    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth };
```

### 5. backend/src/middleware/errorHandler.js
```javascript
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
```

### 6. backend/src/middleware/rateLimiter.js
```javascript
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Límite de consultas IA (20/hora)' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login' },
});

module.exports = { globalLimiter, aiLimiter, authLimiter };
```

### 7. backend/src/routes/auth.routes.js
```javascript
const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;
```

### 8. backend/src/controllers/auth.controller.js
```javascript
const { turso } = require('../config/turso');
const crypto = require('crypto');

function generateJWT(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  })).toString('base64');

  const secret = process.env.JWT_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${header}.${payload}.${signature}`;
}

exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name, school } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Contraseña debe tener 8+ caracteres' });
    }

    const userId = crypto.randomUUID();
    const hashedPwd = crypto.createHash('sha256').update(password).digest('hex');

    await turso.execute({
      sql: `INSERT INTO profiles (id, email, full_name, school) VALUES (?, ?, ?, ?)`,
      args: [userId, email, full_name, school || null],
    });

    await turso.execute({
      sql: `CREATE TABLE IF NOT EXISTS auth (user_id TEXT PRIMARY KEY, password_hash TEXT)`,
    });

    await turso.execute({
      sql: `INSERT INTO auth (user_id, password_hash) VALUES (?, ?)`,
      args: [userId, hashedPwd],
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id: userId, email, full_name },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const hashedPwd = crypto.createHash('sha256').update(password).digest('hex');

    const result = await turso.execute({
      sql: `SELECT p.id, p.email, p.full_name, p.plan, a.password_hash FROM profiles p 
            LEFT JOIN auth a ON p.id = a.user_id WHERE p.email = ?`,
      args: [email],
    });

    if (!result.rows.length || result.rows[0].password_hash !== hashedPwd) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];
    const token = generateJWT(user.id);

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, plan: user.plan },
      access_token: token,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  res.json({ message: 'Sesión cerrada' });
};

exports.me = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT id, email, full_name, school, grade, group_name, plan FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, school, grade, group_name } = req.body;

    await turso.execute({
      sql: `UPDATE profiles SET full_name = ?, school = ?, grade = ?, group_name = ? WHERE id = ?`,
      args: [full_name, school, grade, group_name, req.user.id],
    });

    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    next(err);
  }
};
```

### 9. backend/src/routes/students.routes.js
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/students.controller');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/stats', ctrl.getStats);

module.exports = router;
```

### 10. backend/src/controllers/students.controller.js
```javascript
const { turso } = require('../config/turso');
const crypto = require('crypto');

exports.list = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM students WHERE teacher_id = ? ORDER BY list_number ASC`,
      args: [req.user.id],
    });

    const students = [];
    for (const student of result.rows) {
      const scoresResult = await turso.execute({
        sql: `SELECT score FROM exam_results WHERE student_id = ? ORDER BY created_at DESC`,
        args: [student.id],
      });

      const scores = scoresResult.rows?.map(r => r.score) || [];
      const avg = scores.length ? (scores.reduce((a,b) => a+b) / scores.length).toFixed(1) : null;
      const trend = scores.length >= 2 ? (scores[0] - scores[1]).toFixed(1) : 0;

      students.push({ ...student, avg, trend, exams_count: scores.length });
    }

    res.json({ students, total: students.length });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, list_number, curp, notes } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const id = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO students (id, teacher_id, name, list_number, curp, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, req.user.id, name, list_number || null, curp || null, notes || null],
    });

    res.status(201).json({ student: { id, name, list_number, curp, notes } });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM students WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json({ student: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, list_number, curp, notes, status } = req.body;

    await turso.execute({
      sql: `UPDATE students SET name = ?, list_number = ?, curp = ?, notes = ?, status = ? WHERE id = ? AND teacher_id = ?`,
      args: [name, list_number, curp, notes, status, req.params.id, req.user.id],
    });

    res.json({ message: 'Alumno actualizado' });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await turso.execute({
      sql: `DELETE FROM students WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });

    res.json({ message: 'Alumno eliminado' });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT score, created_at FROM exam_results WHERE student_id = ? AND teacher_id = ? ORDER BY created_at ASC`,
      args: [req.params.id, req.user.id],
    });

    const scores = result.rows?.map(r => r.score) || [];
    const avg = scores.length ? (scores.reduce((a,b) => a+b) / scores.length).toFixed(1) : 0;
    const highest = Math.max(...scores, 0);
    const lowest = Math.min(...scores, 100);
    const status = avg >= 70 ? 'ok' : avg >= 60 ? 'watch' : 'risk';

    res.json({
      results: result.rows,
      stats: { avg, highest, lowest, total_exams: scores.length, status }
    });
  } catch (err) {
    next(err);
  }
};
```

### 11. backend/src/routes/exams.routes.js
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/exams.controller');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.delete('/:id', ctrl.remove);

module.exports = router;
```

### 12. backend/src/controllers/exams.controller.js
```javascript
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
    const { title, subject, group_name, total_items } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ error: 'Título y materia son requeridos' });
    }

    const id = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO exams (id, teacher_id, title, subject, group_name, total_items) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, req.user.id, title, subject, group_name || 'Sin grupo', total_items || 20],
    });

    res.status(201).json({ exam: { id, title, subject } });
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
```

### 13. backend/src/routes/scan.routes.js
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo JPG, PNG o PDF permitidos'));
  },
});

const scanController = require('../controllers/scan.controller');

router.post('/process', requireAuth, upload.single('file'), scanController.processExam);

module.exports = router;
```

### 14. backend/src/controllers/scan.controller.js
```javascript
const { turso } = require('../config/turso');
const ocrService = require('../services/ocr.service');
const crypto = require('crypto');
const fs = require('fs');

exports.processExam = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { subject, group_name, total_items, answer_key } = req.body;

    // Procesar OCR
    const ocrResult = await ocrService.processExamImage(req.file.path);

    const examId = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO exams (id, teacher_id, subject, group_name, total_items, ocr_raw, status) VALUES (?, ?, ?, ?, ?, ?, 'processed')`,
      args: [examId, req.user.id, subject || 'Sin asignar', group_name || 'Sin grupo', total_items || 20, ocrResult.raw_text],
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      exam_id: examId,
      ocr: ocrResult,
      message: 'Examen procesado exitosamente',
    });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path).catch(() => {});
    next(err);
  }
};
```

### 15. backend/src/services/ocr.service.js
```javascript
const Tesseract = require('tesseract.js');

exports.processExamImage = async (imagePath) => {
  console.log('[OCR] Procesando:', imagePath);

  const { data } = await Tesseract.recognize(imagePath, 'spa', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r[OCR] ${(m.progress * 100).toFixed(0)}%`);
      }
    },
  });

  console.log('\n[OCR] Completado');

  const lines = data.text.split('\n').filter(l => l.trim());
  const answers = [];

  lines.forEach(line => {
    const match = line.match(/^(\d+)[.\-\)]\s*([A-Ea-e])/);
    if (match) {
      answers.push({ question: parseInt(match[1]), answer: match[2].toUpperCase() });
    }
  });

  return {
    raw_text: data.text,
    confidence: (data.confidence * 100).toFixed(1),
    answers,
    lines_detected: lines.length,
  };
};

exports.calculateScore = (studentAnswers, answerKey) => {
  let correct = 0, incorrect = 0, blank = 0;
  const total = answerKey.length;

  answerKey.forEach((key, i) => {
    const student = studentAnswers.find(a => a.question === i + 1);
    if (!student) blank++;
    else if (student.answer === key.answer) correct++;
    else incorrect++;
  });

  const score = (correct / total) * 100;
  return { score: parseFloat(score.toFixed(2)), correct, incorrect, blank, total };
};
```

### 16. backend/src/routes/reports.routes.js
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/reports.controller');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/generate', ctrl.generate);

module.exports = router;
```

### 17. backend/src/controllers/reports.controller.js
```javascript
const { turso } = require('../config/turso');
const crypto = require('crypto');

exports.list = async (req, res, next) => {
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM reports WHERE teacher_id = ? ORDER BY created_at DESC`,
      args: [req.user.id],
    });

    res.json({ reports: result.rows || [] });
  } catch (err) {
    next(err);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const { type, title } = req.body;

    if (!type || !['individual', 'group', 'executive'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de reporte inválido' });
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
```

### 18. backend/src/routes/ai.routes.js
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const aiService = require('../services/ai.service');

router.use(requireAuth);
router.use(aiLimiter);

router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    const messages = [...history.slice(-10), { role: 'user', content: message }];
    const result = await aiService.chat(req.user.id, messages);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const result = await aiService.getChatHistory(req.user.id);
    res.json({ history: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

### 19. backend/src/services/ai.service.js
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const { turso } = require('../config/turso');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un asistente pedagógico especializado en educación primaria mexicana, alineado al plan SEP 2023.

Tienes acceso a datos del grupo de la maestra y puedes:
- Analizar rendimiento de alumnos
- Identificar patrones de aprendizaje
- Sugerir estrategias pedagógicas
- Generar planes de clase y material didáctico
- Crear preguntas de evaluación
- Predecir tendencias y alertas

Responde en español, de forma concisa y práctica. Prioriza recomendaciones accionables.`;

exports.chat = async (teacherId, messages, context = {}) => {
  let contextMessage = '';
  if (context.students) {
    const atRisk = context.students.filter(s => (s.avg || 0) < 60).length;
    const avgGroup = context.students.reduce((s,a) => s + (a.avg||0), 0) / context.students.length;
    contextMessage = `\n\n[CONTEXTO DEL GRUPO]\nTotal alumnos: ${context.students.length}\nPromedio: ${avgGroup.toFixed(1)}%\nEn riesgo: ${atRisk}`;
  }

  const systemWithContext = SYSTEM_PROMPT + contextMessage;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemWithContext,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const content = response.content[0].text;
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  await turso.execute({
    sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)`,
    args: [require('crypto').randomUUID(), teacherId, 'user', messages[messages.length-1].content, 0],
  });

  await turso.execute({
    sql: `INSERT INTO ai_chats (id, teacher_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)`,
    args: [require('crypto').randomUUID(), teacherId, 'assistant', content, tokensUsed],
  });

  return { content, tokens_used: tokensUsed };
};

exports.getChatHistory = async (teacherId, limit = 20) => {
  const result = await turso.execute({
    sql: `SELECT role, content, created_at FROM ai_chats WHERE teacher_id = ? ORDER BY created_at DESC LIMIT ?`,
    args: [teacherId, limit],
  });

  return result.rows || [];
};
```

### 20. backend/.env.example
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

TURSO_CONNECTION_URL=libsql://intelliexam-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...

ANTHROPIC_API_KEY=sk-ant-...

JWT_SECRET=tu-secret-string-largo-minimo-32-caracteres

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX=20

MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads
```

### 21. backend/.gitignore
```
node_modules/
.env
uploads/*.jpg
uploads/*.png
uploads/*.pdf
*.log
.DS_Store
dist/
build/
```

### 22. backend/package.json
```json
{
  "name": "intelliexam-backend",
  "version": "3.0.0",
  "description": "Backend para IntelliExam - Gestión docente con IA",
  "main": "server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node server.js"
  },
  "keywords": ["intelliexam", "education", "ai"],
  "author": "Zyntra Intelligence",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "morgan": "^1.10.0",
    "@libsql/client": "^0.3.5",
    "jsonwebtoken": "^9.1.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.0",
    "multer": "^1.4.5-lts.1",
    "tesseract.js": "^5.0.4",
    "@anthropic-ai/sdk": "^0.20.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## ARCHIVOS ADICIONALES PARA COMPLETAR

También crea VACÍOS estos archivos (el usuario puede llenarlos luego):

- `backend/src/utils/validators.js` (validación de inputs)
- `backend/src/utils/formatters.js` (formateo de respuestas)
- `backend/src/services/pdf.service.js` (generación de PDFs)
- `backend/README-LOCAL.md` (documentación local)

---

## DESPUÉS DE CREAR LOS ARCHIVOS

El usuario debe:

1. Copiar `.env.example` a `.env`
2. Rellenar valores reales en `.env`
3. Ejecutar en la terminal del proyecto:
```bash
cd backend
npm run dev
```

4. Verificar que el servidor inicie en `http://localhost:3001`

---

*Generado para Zyntra Intelligence*
*IntelliExam v3 · Mayo 2026*
