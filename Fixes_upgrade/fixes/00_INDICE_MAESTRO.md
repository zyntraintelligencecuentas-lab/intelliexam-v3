# 📋 ÍNDICE MAESTRO — IntelliExam v4
**Auditor**: Claude Senior (Zyntra Intelligence)  
**Ejecutor**: Antigravity  
**Objetivo**: Backend funcional + Frontend v4 integrado y desplegado

---

## 🗂️ ARCHIVOS QUE TIENES

| Archivo | Contenido | Para quién |
|---|---|---|
| `01_AUDITORIA_BACKEND.md` | Diagnóstico completo, bugs detectados, mapa de endpoints | Contexto y referencia |
| `02_BACKEND_FIXES.md` | Código exacto de cada fix, orden de ejecución | **Antigravity — ejecutar** |
| `03_FRONTEND_INTEGRATION.md` | Código JS para conectar el frontend v4 al backend | **Antigravity — ejecutar** |
| `04_DEPLOY_GUIDE.md` | Instrucciones de Render + Netlify + E2E testing | **Antigravity — ejecutar** |
| `intelliexam_v4_preview.html` | El frontend con diseño aprobado (referencia visual) | Base del frontend |

---

## ⚡ ORDEN DE EJECUCIÓN PARA ANTIGRAVITY

### SEMAFORO: ROJO → AMARILLO → VERDE

```
🔴 CRÍTICO (Sin esto el app no funciona)
│
├── 1. Abre backend/ en tu editor
│
├── 2. BACKEND FIX-05: Agregar CLAUDE_MODEL al .env
│   └── Archivo: .env
│
├── 3. BACKEND FIX-06: Verificar session_id en Turso
│   └── Ejecutar SQL en Turso shell
│
├── 4. BACKEND FIX-01: Migrar IA de OpenAI → Claude
│   └── Archivo: src/services/ai.service.js (3 cambios)
│   └── Archivo: src/controllers/exams.controller.js (2 cambios)  
│   └── Archivo: src/controllers/reports.controller.js (1 cambio)
│
├── 5. BACKEND FIX-02: Crear /api/dashboard
│   └── Crear: src/routes/dashboard.routes.js (código completo en 02_BACKEND_FIXES.md)
│   └── Editar: server.js (2 líneas: import + use)
│
├── 6. npm run dev → verificar que arranca sin errores
│
├── 7. Test: curl http://localhost:3001/api/health → debe responder
│
└── 8. Test: POST /api/auth/login con demo@intelliexam.com / Demo1234

🟡 IMPORTANTE (App funciona pero incompleta sin esto)
│
├── 9. BACKEND FIX-03: Corregir typo fronted/frontend en server.js
│
├── 10. BACKEND FIX-07: Mejorar CORS en server.js
│
├── 11. FRONTEND: Copiar intelliexam_v4_preview.html → app.html en carpeta frontend
│
├── 12. FRONTEND PASO-01: Agregar const API + getToken() + api() wrapper
│
├── 13. FRONTEND PASO-02: Reemplazar init() con la versión que llama al backend
│
├── 14. FRONTEND PASO-03: Agregar IDs a los KPI cards en el HTML
│
├── 15. FRONTEND PASO-04: Reemplazar renderStudents() y renderExams()
│
├── 16. FRONTEND PASO-05: Reemplazar sendMsg() para llamar a /api/ai/chat
│
├── 17. FRONTEND PASO-06: Conectar historial de chats con backend
│
├── 18. FRONTEND PASO-07: Verificar/actualizar login.html
│
├── 19. FRONTEND PASO-08: Conectar logout
│
├── 20. Test E2E: Login → Dashboard → Ameyalli chat
│
└── 21. Confirmar que datos reales aparecen (no mock)

🟢 PRODUCCIÓN (Cuando todo funciona local)
│
├── 22. DEPLOY FASE-1: Crear repo GitHub del backend
│
├── 23. DEPLOY FASE-2: Verificar Turso en producción  
│
├── 24. DEPLOY FASE-3: Estructura de carpetas correcta
│
├── 25. DEPLOY FASE-4: Deploy backend a Render
│
├── 26. DEPLOY FASE-5: Deploy frontend a Netlify
│
├── 27. DEPLOY FASE-6: Testing E2E en producción
│
└── 28. ✅ LIVE
```

---

## 🚨 REGLAS PARA ANTIGRAVITY

### LO QUE SÍ HACES

- Escribes el código **exactamente** como está en los `.md`
- Si algo falla, reportas el error exacto y esperas instrucción
- Ejecutas `npm run dev` después de cada fix para verificar
- Usas los bloques de código como copy-paste, no los reinterpretas

### LO QUE NO HACES

- **No cambias** el CSS/diseño del frontend v4 (está aprobado)
- **No cambias** la arquitectura del backend (tablas, rutas existentes)
- **No agregas** dependencias sin consultar
- **No borras** código que no está listado para borrar
- **No improvisas** lógica — si algo no está en los `.md`, preguntas

---

## 🔑 DATOS CRÍTICOS

```
Backend actual:   http://localhost:3001
Frontend actual:  Abrir login.html en browser

Turso DB:         intelliexam-zyntraintelligencecuentas-lab
Turso URL:        libsql://intelliexam-zyntraintelligencecuentas-lab.aws-us-east-1.turso.io

Claude Model:     claude-sonnet-4-20250514
IA Target:        Ameyalli — cálida, profesional, pedagógica

Demo credentials:
  email:    demo@intelliexam.com
  password: Demo1234
```

---

## 📊 BUGS DETECTADOS (Resumen ejecutivo)

| # | Bug | Impacto | Fix |
|---|---|---|---|
| B1 | IA usa OpenAI en lugar de Claude | App no usa Claude en absoluto | FIX-01 |
| B2 | `/api/dashboard` no existe | Dashboard siempre muestra mock | FIX-02 |
| B3 | Typo `fronted` vs `frontend` | No sirve archivos estáticos | FIX-03 |
| B4 | Supabase ANON KEY vacía | RAG SEP no funciona | Pendiente Carlos |
| B5 | `session_id` puede no estar en Turso | Chat IA crashea en INSERT | FIX-06 |
| B6 | CORS solo permite 2 orígenes hardcoded | Puede bloquear Netlify | FIX-07 |
| B7 | Passwords SHA-256 (inseguro) | Seguridad débil | FIX-04 (opcional) |

---

## ❓ QUÉ NECESITA CARLOS

Antes del deploy completo, Carlos necesita proveer:

1. **Supabase ANON KEY** real para el RAG SEP
   - Ir a supabase.co → proyecto `uvwqsrqclxuzhskevufy` → Settings → API → anon key
   - Poner en `.env`: `SUPABASE_ANON_KEY=eyJ...`

2. **Confirmar nombre de carpeta del frontend**
   - ¿Se llama `frontend/` o `fronted/`?
   - Para corregir el path en `server.js`

3. **URL de Render** (cuando esté desplegado)
   - Para actualizar la variable `API` en los archivos HTML

4. **URL de Netlify** (cuando esté desplegado)
   - Para configurar `ALLOWED_ORIGINS` en Render

---

## 💰 RESUMEN DE COSTOS ESTIMADOS

| Servicio | Plan | Costo/mes |
|---|---|---|
| Render (backend) | Free tier | $0 (con limitaciones) o $7 starter |
| Netlify (frontend) | Free | $0 |
| Turso (DB) | Free (5GB) | $0 hasta escalar |
| Anthropic Claude | Pay per use | ~$0.01-0.10 por conversación |
| OpenAI (RAG embeddings) | Pay per use | ~$0.001 por búsqueda |
| **Total aprox.** | **Desarrollo** | **~$0-7/mes** |
| **Total aprox.** | **1,000 docentes** | **~$200-500/mes IA** |

---

*Auditoría completada por Claude Senior — Zyntra Intelligence*  
*Fecha: Mayo 2026*  
*Próxima revisión: Después de deploy a producción*
