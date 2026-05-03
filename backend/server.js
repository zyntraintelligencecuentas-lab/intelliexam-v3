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
const dashboardRoutes = require('./src/routes/dashboard.routes');
const errorHandler = require('./src/middleware/errorHandler');
const { globalLimiter } = require('./src/middleware/rateLimiter');
const { requestLogger, logger } = require('./src/middleware/logger');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile, curl, Postman)
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origen no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use(globalLimiter);

const FRONTEND_PATH = path.isAbsolute(process.env.FRONTEND_PATH || '') 
  ? process.env.FRONTEND_PATH 
  : path.join(process.cwd(), 'frontend');

console.log('[SERVER] Sirviendo frontend desde:', FRONTEND_PATH);

app.use(express.static(FRONTEND_PATH));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
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
  res.sendFile(path.join(FRONTEND_PATH, 'login.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('SERVER', `IntelliExam backend iniciado`, {
    port:    PORT,
    env:     process.env.NODE_ENV || 'development',
    turso:   process.env.TURSO_CONNECTION_URL ? 'conectado' : 'sin configurar',
    claude:  process.env.ANTHROPIC_API_KEY ? 'configurado' : 'sin configurar',
    version: '3.0.0',
  });
});

module.exports = app;
