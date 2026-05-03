# 🚀 DEPLOY GUIDE — Local → Producción
**Para Antigravity**: Sigue este orden exacto.

---

## FASE 1 · Verificar que funciona local (ANTES del deploy)

```bash
# Desde la carpeta backend/
npm run dev

# Terminal 2 - correr tests básicos
node -e "
const http = require('http');
http.get('http://localhost:3001/api/health', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('HEALTH:', JSON.parse(d)));
});
"
```

**Esperado**:
```json
{"status":"ok","version":"3.0.0","db":"TURSO"}
```

Si falla → revisar `.env` y Turso connection.

---

## FASE 2 · Verificar Turso en producción

```bash
# Instalar Turso CLI si no está
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Ver tu DB
turso db list

# Conectar al shell
turso db shell intelliexam-zyntraintelligencecuentas-lab

# Verificar tablas
.tables

# Verificar usuario demo existe
SELECT * FROM profiles WHERE email = 'demo@intelliexam.com';

# Verificar que session_id existe en ai_chats
PRAGMA table_info(ai_chats);

# Salir
.quit
```

---

## FASE 3 · Estructura de carpetas esperada en el servidor

```
proyecto-root/
├── backend/              ← El backend actual
│   ├── server.js
│   ├── src/
│   ├── .env              ← NO va a GitHub
│   └── package.json
│
└── frontend/             ← El frontend v4
    ├── login.html
    └── app.html
```

> El servidor de Express sirve el frontend desde `../frontend` (después de FIX-03).

---

## FASE 4 · Deploy a Render (Backend)

### 4.1 Crear repositorio

```bash
cd backend/
git init
git add .
git commit -m "IntelliExam backend v3 - pre-deploy"

# Crear repo en GitHub (sin .env en el commit)
# .gitignore debe tener: .env, node_modules/, uploads/
```

### 4.2 Crear `render.yaml` en la raíz del backend

```yaml
services:
  - type: web
    name: intelliexam-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: TURSO_CONNECTION_URL
        sync: false  # lo pones manual en Render dashboard
      - key: TURSO_AUTH_TOKEN
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: CLAUDE_MODEL
        value: claude-sonnet-4-20250514
      - key: ALLOWED_ORIGINS
        sync: false  # pon tu URL de Netlify aquí
```

### 4.3 En el dashboard de Render

1. Nuevo Web Service → conecta repo GitHub
2. Agrega variables de entorno manualmente:
   ```
   NODE_ENV = production
   TURSO_CONNECTION_URL = libsql://intelliexam-zyntraintelligencecuentas-lab.aws-us-east-1.turso.io
   TURSO_AUTH_TOKEN = eyJhbGci... (tu token real)
   ANTHROPIC_API_KEY = sk-ant-... (tu key real)
   JWT_SECRET = (genera uno nuevo con crypto.randomBytes(64).toString('hex'))
   CLAUDE_MODEL = claude-sonnet-4-20250514
   ALLOWED_ORIGINS = https://intelliexam.netlify.app
   ```
3. Deploy → copia la URL: `https://intelliexam-backend.onrender.com`

---

## FASE 5 · Deploy a Netlify (Frontend)

### 5.1 Estructura de archivos

```bash
# Crea carpeta para Netlify
mkdir netlify-frontend
cp app.html netlify-frontend/
cp login.html netlify-frontend/
```

### 5.2 Actualizar la URL de API en los archivos

En `app.html` y `login.html`, actualiza:
```javascript
const API = (window.location.hostname === 'localhost')
  ? 'http://localhost:3001/api'
  : 'https://intelliexam-backend.onrender.com/api'; // ← tu URL real de Render
```

### 5.3 Deploy a Netlify

**Opción A (Drag & Drop)**:
1. Ve a netlify.com → Sites → drag & drop la carpeta `netlify-frontend`
2. Netlify asigna URL: `https://random-name.netlify.app`
3. En Site Settings → Domain → cambia a `intelliexam`

**Opción B (Git)**:
```bash
cd netlify-frontend
git init
git add .
git commit -m "IntelliExam frontend v4"
git push origin main
# Conectar en Netlify dashboard
```

### 5.4 Actualizar ALLOWED_ORIGINS en Render

En Render, actualiza la variable:
```
ALLOWED_ORIGINS = https://intelliexam.netlify.app,http://localhost:3000
```

---

## FASE 6 · Testing E2E en producción

```bash
BACKEND_URL="https://intelliexam-backend.onrender.com"

# 1. Health
curl $BACKEND_URL/api/health

# 2. Login
TOKEN=$(curl -s -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@intelliexam.com","password":"Demo1234"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).access_token))")

echo "TOKEN: $TOKEN"

# 3. Dashboard
curl -H "Authorization: Bearer $TOKEN" $BACKEND_URL/api/dashboard | head -200

# 4. Chat Ameyalli
curl -X POST $BACKEND_URL/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Hola Ameyalli","history":[]}'
```

---

## FASE 7 · Checklist final de producción

```
BACKEND
[ ] npm run dev funciona sin errores
[ ] GET /api/health → {"status":"ok"}
[ ] POST /api/auth/login → retorna token
[ ] GET /api/dashboard → retorna datos reales de Turso
[ ] POST /api/ai/chat → responde con Claude (no OpenAI)
[ ] GET /api/ai/sessions → retorna historial
[ ] DELETE /api/ai/sessions/:id → elimina sesión
[ ] POST /api/students/import → acepta CSV
[ ] POST /api/reports/pdf/planeacion → retorna HTML
[ ] Render deploy exitoso → URL activa
[ ] Variables de entorno en Render configuradas
[ ] CORS no bloquea Netlify

FRONTEND
[ ] login.html conecta a backend real
[ ] login → redirige a app.html
[ ] app.html carga datos reales (no mock)
[ ] KPIs muestran números reales
[ ] Lista de alumnos desde DB
[ ] Lista de exámenes desde DB
[ ] Chat con Ameyalli (respuestas de Claude)
[ ] Historial de chats visible
[ ] Eliminar chat funciona
[ ] Import CSV funciona
[ ] Generar PDF abre ventana con HTML imprimible
[ ] Logout limpia sesión y redirige
[ ] Mobile responsive funciona
```

---

## TEMPLATE CSV para alumnos

```csv
numero,nombre,notas
1,Ana Sofía Martínez,Excelente participación
2,José Ramírez,
3,Valentina Cruz,Requiere seguimiento en fracciones
4,Roberto Sánchez,
5,María López,Mejoró significativamente este bimestre
```

**Columnas**:
- `numero` → list_number (opcional)
- `nombre` → name (requerido)
- `notas` → notes (opcional)

---

## Credenciales demo

```
Email:    demo@intelliexam.com
Password: Demo1234
```

> Para crear tu propio usuario en producción:
> ```bash
> curl -X POST https://TU-BACKEND.onrender.com/api/auth/register \
>   -H "Content-Type: application/json" \
>   -d '{"email":"carlos@zyntra.mx","password":"TuPassword123","full_name":"Carlos Villa","school":"Escuela Demo"}'
> ```
