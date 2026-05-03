# IntelliExam Backend v3.0

Backend completo para IntelliExam con TURSO, OCR y Claude AI.

## 🚀 Inicio rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Copia `.env.example` a `.env` y configura tus credenciales:

```env
TURSO_CONNECTION_URL=libsql://tu-database.turso.io
TURSO_AUTH_TOKEN=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=tu-secret-largo-y-seguro
```

### 3. Iniciar servidor
```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3001`

---

## 📁 Estructura del proyecto

```
backend/
├── src/
│   ├── config/          # Configuración (Turso, env)
│   ├── middleware/      # Auth, errorHandler, rateLimiter
│   ├── routes/          # Rutas de la API
│   ├── controllers/     # Lógica de negocio
│   ├── services/        # Servicios (OCR, AI, PDF)
│   └── utils/           # Validadores y formateadores
├── uploads/             # Archivos temporales
├── server.js            # Punto de entrada
├── .env                 # Variables de entorno (no versionado)
└── package.json
```

---

## 🛣️ API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener perfil actual
- `PUT /api/auth/profile` - Actualizar perfil

### Estudiantes
- `GET /api/students` - Listar estudiantes
- `POST /api/students` - Crear estudiante
- `GET /api/students/:id` - Obtener estudiante
- `PUT /api/students/:id` - Actualizar estudiante
- `DELETE /api/students/:id` - Eliminar estudiante
- `GET /api/students/:id/stats` - Estadísticas del estudiante

### Exámenes
- `GET /api/exams` - Listar exámenes
- `POST /api/exams` - Crear examen
- `GET /api/exams/:id` - Obtener examen
- `DELETE /api/exams/:id` - Eliminar examen

### Escaneo OCR
- `POST /api/scan/process` - Procesar imagen de examen (multipart/form-data)

### Reportes
- `GET /api/reports` - Listar reportes
- `POST /api/reports/generate` - Generar reporte

### Inteligencia Artificial
- `POST /api/ai/chat` - Chat con Claude AI
- `GET /api/ai/history` - Historial de conversaciones

### Salud
- `GET /api/health` - Estado del servidor

---

## 🔒 Seguridad

### Rate Limiting
- **Global**: 100 requests / 15 minutos
- **Auth**: 10 requests / 15 minutos
- **IA**: 20 requests / hora

### Autenticación
- JWT personalizado (sin dependencias externas)
- Tokens expiran en 24 horas
- Contraseñas hasheadas con SHA-256

### Validaciones
- Express-validator para validación de inputs
- Sanitización de datos
- Protección CSRF via CORS configurado

---

## 🗄️ Base de datos (TURSO)

### Tablas requeridas

```sql
-- Perfiles de usuarios
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  school TEXT,
  grade TEXT,
  group_name TEXT,
  plan TEXT DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Autenticación
CREATE TABLE auth (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Estudiantes
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  list_number INTEGER,
  curp TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id)
);

-- Exámenes
CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT,
  subject TEXT NOT NULL,
  group_name TEXT,
  total_items INTEGER DEFAULT 20,
  ocr_raw TEXT,
  status TEXT DEFAULT 'draft',
  exam_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id)
);

-- Resultados de exámenes
CREATE TABLE exam_results (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  score REAL NOT NULL,
  correct INTEGER,
  incorrect INTEGER,
  blank INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (teacher_id) REFERENCES profiles(id)
);

-- Reportes
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id)
);

-- Chat con IA
CREATE TABLE ai_chats (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES profiles(id)
);
```

---

## 🧪 Testing

Prueba el endpoint de salud:
```bash
curl http://localhost:3001/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "version": "3.0.0",
  "timestamp": "2026-05-02T...",
  "environment": "development",
  "db": "TURSO"
}
```

---

## 🐛 Troubleshooting

### Error: "Variables de entorno faltantes"
→ Asegúrate de que `.env` existe y contiene todas las variables requeridas.

### Error: "TURSO connection failed"
→ Verifica que `TURSO_CONNECTION_URL` y `TURSO_AUTH_TOKEN` sean correctos.

### Error: "Token inválido"
→ El `JWT_SECRET` debe ser el mismo que se usó para generar el token.

### Puerto 3001 ocupado
→ Cambia `PORT=3001` en `.env` a otro puerto disponible.

---

## 📦 Dependencias principales

- **express**: Framework web
- **@libsql/client**: Cliente de Turso DB
- **@anthropic-ai/sdk**: Claude AI (Sonnet 4.5)
- **tesseract.js**: OCR para escaneo de exámenes
- **multer**: Upload de archivos
- **helmet**: Seguridad HTTP
- **express-rate-limit**: Rate limiting
- **cors**: CORS configurado

---

## 📝 Notas de desarrollo

- El OCR procesa en español (`spa`)
- Los tokens JWT son válidos por 24 horas
- Las contraseñas se hashean con SHA-256 (considera bcrypt en producción)
- Multer permite archivos hasta 10MB
- El asistente IA usa Claude Sonnet 4.5

---

## 🚀 Deploy

Para producción, configura:
```env
NODE_ENV=production
PORT=443
```

Considera usar:
- PM2 para gestión de procesos
- Nginx como reverse proxy
- SSL/TLS (Let's Encrypt)

---

**Desarrollado con ❤️ por Zyntra Intelligence**  
*Mayo 2026 - IntelliExam v3*
