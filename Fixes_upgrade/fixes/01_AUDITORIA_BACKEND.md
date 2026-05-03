# 🔍 AUDITORÍA BACKEND — IntelliExam v3
**Auditor Senior**: Claude (Zyntra Intelligence)  
**Programador Ejecutor**: Antigravity  
**Fecha**: Mayo 2026  
**Estado del backend**: Funcional con bugs críticos y mejoras requeridas

---

## 📊 DIAGNÓSTICO EJECUTIVO

| Área | Estado | Prioridad |
|---|---|---|
| Autenticación JWT | ⚠️ Funcional pero inseguro (SHA-256) | ALTA |
| IA (Ameyalli) | ❌ Usa OpenAI en lugar de Claude | CRÍTICA |
| Dashboard endpoint | ❌ NO EXISTE | CRÍTICA |
| CORS fronted path | ❌ Typo en `../fronted` | ALTA |
| ai_chats session_id | ⚠️ ALTER TABLE duplicado en schema | MEDIA |
| students.importCSV | ⚠️ Solo acepta 3 columnas, debería aceptar más | MEDIA |
| PDF — sin endpoint `/api/reports/pdf/planeacion` en docs | ✅ Existe como `/api/reports/pdf/planeacion` | OK |
| Rate limit IA | ⚠️ 20/hora es muy restrictivo para demo | BAJA |
| Supabase ANON KEY | ❌ `AQUI_VA_TU_SUPABASE_ANON_KEY` — vacía | ALTA |

---

## 🚨 BUGS CRÍTICOS (Ejecutar primero)

### BUG-01 · La IA usa OpenAI, no Claude

**Archivo**: `src/services/ai.service.js`  
**Problema**: El chat principal y `generatePlaneacion` usan `gpt-4o-mini` aunque el SDK de Anthropic está instalado y el `.env` tiene `ANTHROPIC_API_KEY`. El README dice "Claude Sonnet 4.5" pero el código llama a OpenAI.  
**Impacto**: Costo innecesario, inconsistencia con la promesa del producto, Ameyalli no usa Claude.

**Fix requerido** → Ver `02_BACKEND_FIXES.md`

---

### BUG-02 · Endpoint `/api/dashboard` no existe

**Problema**: El frontend llama a `GET /api/dashboard` para cargar KPIs, exámenes y alumnos pero este endpoint no existe en ninguna ruta del backend.  
**Impacto**: El frontend muestra siempre datos mock. La app no carga datos reales.

**Fix requerido** → Ver `02_BACKEND_FIXES.md`

---

### BUG-03 · Typo en path del frontend estático

**Archivo**: `server.js` línea 34  
**Código actual**:
```javascript
app.use(express.static(path.join(__dirname, '../fronted')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../fronted/login.html'));
});
```
**Problema**: `fronted` debería ser `frontend`. Si la carpeta se llama `frontend`, el servidor no sirve los archivos estáticos.  
**Fix**: Confirmar nombre real de la carpeta y corregir el path.

---

### BUG-04 · Supabase ANON KEY vacía → RAG no funciona

**Archivo**: `.env`  
**Código actual**: `SUPABASE_ANON_KEY=AQUI_VA_TU_SUPABASE_ANON_KEY`  
**Impacto**: El RAG SEP nunca se ejecuta. Ameyalli responde sin contexto curricular.  
**Fix**: Obtener la ANON KEY real del proyecto Supabase de Zyntra.

---

### BUG-05 · `session_id` faltante en tabla `ai_chats`

**Archivo**: `database/schema.sql`  
**Problema**: El schema crea `ai_chats` sin `session_id` y luego lo agrega con `ALTER TABLE`. Si la tabla ya existe en Turso sin ese campo, los INSERT del servicio AI fallarán silenciosamente.  
**Fix**: Verificar que el campo existe en Turso con:
```sql
PRAGMA table_info(ai_chats);
```
Si no existe `session_id`, ejecutar:
```sql
ALTER TABLE ai_chats ADD COLUMN session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_chats_session ON ai_chats(teacher_id, session_id);
```

---

## ⚠️ PROBLEMAS DE SEGURIDAD

### SEC-01 · Contraseñas con SHA-256 (débil)
**Archivo**: `src/controllers/auth.controller.js`  
**Problema**: SHA-256 no es seguro para contraseñas. Es rápido y sin salt, vulnerable a rainbow tables.  
**Fix**: Migrar a `bcrypt` (ya está en `package.json` como dependencia aunque no se usa).

### SEC-02 · JWT secret débil en `.env`
**Valor actual**: `43a3a5941c9bc43a3a5941c9bc43a3a5941c9bc43a3a5941c9bc43a3a5941c9bc`  
**Problema**: El mismo secret en todos los ambientes. En producción debe ser único y rotado.  
**Fix**: Generar nuevo secret antes del deploy:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### SEC-03 · API Keys expuestas en `.env` commiteado
**Problema**: El `.env` con claves reales de Anthropic, OpenAI y Turso está en el ZIP.  
**Fix**: Asegurarse de que `.gitignore` incluye `.env` antes de cualquier push a GitHub.

---

## 📋 MAPA COMPLETO DE ENDPOINTS ACTUALES

```
POST   /api/auth/login
POST   /api/auth/register  
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/profile

GET    /api/students
POST   /api/students
POST   /api/students/import
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
GET    /api/students/:id/stats

GET    /api/exams
POST   /api/exams
GET    /api/exams/:id
DELETE /api/exams/:id

POST   /api/scan/process

GET    /api/reports
POST   /api/reports/generate
POST   /api/reports/pdf/planeacion  ← genera planeación + HTML
POST   /api/reports/pdf/group       ← genera reporte grupal
GET    /api/reports/student/:id     ← reporte individual con IA

POST   /api/ai/chat
GET    /api/ai/history
GET    /api/ai/sessions
GET    /api/ai/sessions/:sessionId
DELETE /api/ai/sessions/:sessionId
POST   /api/ai/planeacion

GET    /api/health
```

**FALTA**: `GET /api/dashboard` ← lo crea Antigravity en `02_BACKEND_FIXES.md`

---

## 🗺️ ARQUITECTURA REAL VS ESPERADA

```
ESTADO ACTUAL:
Frontend (app.html)
    ↓ fetch GET /api/dashboard     ← ❌ NO EXISTE → mock data
    ↓ fetch POST /api/ai/chat      ← ⚠️ usa OpenAI no Claude
    ↓ fetch POST /api/auth/login   ← ✅ funciona
    ↓ fetch GET /api/auth/me       ← ✅ funciona
    ↓ fetch GET /api/students      ← ✅ funciona
    ↓ fetch GET /api/exams         ← ✅ funciona

ESTADO OBJETIVO (después de fixes):
Frontend v4 (intelliexam_v4_preview.html)
    ↓ fetch GET /api/dashboard     ← ✅ nuevo endpoint
    ↓ fetch POST /api/ai/chat      ← ✅ Claude Sonnet 3.5
    ↓ fetch POST /api/auth/login   ← ✅ + bcrypt
    ↓ fetch GET /api/auth/me       ← ✅
    ↓ fetch GET /api/students      ← ✅
    ↓ fetch GET /api/exams         ← ✅
    ↓ fetch GET /api/ai/sessions   ← ✅ historial chats
    ↓ fetch DELETE /ai/sessions/:id ← ✅ eliminar chats
    ↓ fetch POST /reports/pdf/planeacion ← ✅
```
