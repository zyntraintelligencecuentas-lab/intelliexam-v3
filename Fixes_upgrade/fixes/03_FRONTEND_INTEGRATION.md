# 🎨 FRONTEND v4 — Integración con Backend
**Archivo de referencia visual**: `intelliexam_v4_preview.html`  
**Regla #1**: El diseño NO se toca. Solo se conecta y corrige JS.

---

## CONTEXTO: Qué tiene el frontend v4

El archivo `intelliexam_v4_preview.html` tiene:
- ✅ Diseño OLED/Bento/Spatial completo
- ✅ Partículas animadas
- ✅ 6 tabs: Dashboard, Alumnos, Exámenes, Escanear, Reportes, Ameyalli IA
- ✅ Datos mock para demostración
- ❌ No tiene variable `API` definida
- ❌ No tiene funciones fetch reales
- ❌ No tiene manejo de sesión/token
- ❌ El historial de chat es solo localStorage (ya parcialmente funcional)

---

## PASO 1 · Agregar variable API y función genérica

**Agrega** esto al inicio del bloque `<script>` en `app.html` (o el nombre del archivo final):

```javascript
/* ═══════════════════════════════════════
   CONFIG — Cambia en producción
   ═══════════════════════════════════════ */
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : 'https://TU-BACKEND.onrender.com/api'; // ← actualizar cuando tengas URL de Render

/* ── Token helpers ── */
function getToken() {
  return localStorage.getItem('ie_token') || sessionStorage.getItem('ie_token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('ie_user') || sessionStorage.getItem('ie_user') || 'null');
  } catch { return null; }
}

/* ── API wrapper ── */
async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {}),
    },
  });

  if (res.status === 401) {
    // Token expirado → redirigir a login
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error ' + res.status);
  }

  return res.json();
}
```

---

## PASO 2 · Auth guard y carga inicial

**Reemplaza** la función `init()` del mock con:

```javascript
/* ── Auth guard ── */
async function init() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    await loadDashboard();
    await loadUserUI();
  } catch (err) {
    console.error('[BOOT]', err);
    toast('Error conectando al servidor', 'err');
  }
}

/* ── Cargar datos del dashboard ── */
async function loadDashboard() {
  const data = await api('/dashboard');
  if (!data) return;

  // Actualizar KPIs
  setKPI('kpi-exams', data.stats.total_exams);
  setKPI('kpi-avg', data.stats.group_avg);
  setKPI('kpi-risk', data.stats.at_risk);
  if (data.stats.critical_subject) {
    setKPIText('kpi-critical', data.stats.critical_subject.subject);
  }

  // Guardar datos globales para el chat
  window.IE_STUDENTS = data.students;
  window.IE_EXAMS    = data.exams;
  window.IE_PROFILE  = data.profile;

  // Render listas
  renderTopList(data.students);
  renderTopicBars();
  initCharts(data.exams, data.students);
  renderStudents(data.students);
  renderExams(data.exams);

  // Badge sidebar
  const el = document.getElementById('badge-s');
  if (el) el.textContent = data.students.length;
}

function setKPI(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

function setKPIText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

/* ── Actualizar UI del usuario ── */
async function loadUserUI() {
  const user = getUser();
  if (!user) return;

  const ini = (user.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const nameEl = document.querySelector('.user-name');
  const avEl   = document.querySelector('.user-av');
  const roleEl = document.querySelector('.user-role');

  if (nameEl) nameEl.textContent = user.full_name || 'Docente';
  if (avEl)   avEl.textContent   = ini;
  if (roleEl) roleEl.textContent = `${user.plan?.toUpperCase() || 'FREE'} · ${user.grade || ''} ${user.group_name || ''}`.trim();
}

/* ── Boot ── */
window.addEventListener('load', () => {
  init();
  renderChatList();
});
```

---

## PASO 3 · Agregar IDs a los KPI cards en el HTML

En el HTML del dashboard, agrega los IDs a los valores de KPI:

```html
<!-- KPI Exámenes -->
<div class="kpi-val kv-b"><span id="kpi-exams" class="counter" data-t="0">0</span></div>

<!-- KPI Promedio -->
<div class="kpi-val kv-g"><span id="kpi-avg" class="counter" data-t="0">0</span>%</div>

<!-- KPI En riesgo -->
<div class="kpi-val kv-r"><span id="kpi-risk" class="counter" data-t="0">0</span></div>

<!-- KPI Tema crítico -->
<div class="kpi-val kv-a" id="kpi-critical" style="font-size:19px;line-height:1.3;margin-top:6px">—</div>
```

---

## PASO 4 · Conectar renderStudents y renderExams con datos reales

**Reemplaza** la función `renderStudents` con una que acepte datos del API:

```javascript
// Datos globales
let G_STUDENTS = [];
let G_EXAMS    = [];

function renderStudents(students, filter = '') {
  G_STUDENTS = students || G_STUDENTS;
  const tb   = document.getElementById('tbody-s');
  if (!tb) return;

  const list = G_STUDENTS.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);

  tb.innerHTML = list.map(s => {
    const avg   = s.avg !== null ? parseFloat(s.avg) : null;
    const trend = parseFloat(s.trend || 0);
    const sb    = s.status === 'ok'
      ? '<span class="badge bg">Normal</span>'
      : s.status === 'watch'
        ? '<span class="badge ba">Vigilar</span>'
        : '<span class="badge br">Riesgo</span>';
    const tc    = trend > 0 ? 'var(--a1)' : trend < 0 ? 'var(--a5)' : 'var(--tx3)';
    const tSign = trend > 0 ? '+' : '';

    return `<tr>
      <td style="font-family:var(--mono);color:var(--tx3);font-size:11px">${s.list_number || '—'}</td>
      <td style="color:var(--tx)"><span style="display:inline-flex;align-items:center;gap:8px">
        <span style="width:24px;height:24px;border-radius:50%;background:var(--g2);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--tx2)">${ini(s.name)}</span>
        ${s.name}</span></td>
      <td><span class="badge ${avg >= 80 ? 'bg' : avg >= 70 ? 'ba' : avg !== null ? 'br' : ''}">${avg !== null ? avg + '%' : '—'}</span></td>
      <td style="font-family:var(--mono);font-size:11px;color:${tc}">${tSign}${trend} pts</td>
      <td>${sb}</td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--tx3)">${s.last || s.exams_count + ' exams'}</td>
      <td><button class="btn" style="font-size:10.5px;padding:4px 9px" onclick="toast('Perfil de ${s.name.split(' ')[0]}','ok')">Ver</button></td>
    </tr>`;
  }).join('');
}

function renderExams(exams) {
  G_EXAMS    = exams || G_EXAMS;
  const tbody = document.querySelector('#pg-exams table tbody');
  if (!tbody || !G_EXAMS.length) return;

  tbody.innerHTML = G_EXAMS.map(e => {
    const avg = e.avg_score !== null ? parseFloat(e.avg_score) : null;
    const badge = avg >= 80 ? 'bg' : avg >= 70 ? 'ba' : avg !== null ? 'br' : '';
    const date  = e.exam_date ? new Date(e.exam_date).toLocaleDateString('es-MX', {day:'2-digit', month:'short'}) : '—';
    return `<tr>
      <td style="color:var(--tx)">${e.title || 'Sin título'}</td>
      <td><span class="badge bb">${e.subject}</span></td>
      <td style="font-family:var(--mono);font-size:11px">${e.group_name || '—'}</td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--tx3)">${date}</td>
      <td style="font-family:var(--mono);font-size:11px">${e.results_count || 0}</td>
      <td>${avg !== null ? `<span class="badge ${badge}">${avg}%</span>` : '—'}</td>
      <td><span class="badge bg">✓ Listo</span></td>
    </tr>`;
  }).join('');
}

function filterS() {
  renderStudents(null, document.getElementById('search-s')?.value || '');
}
```

---

## PASO 5 · Conectar chat Ameyalli al backend real

**Reemplaza** la función `sendMsg()`:

```javascript
/* ── Chat history para el API ── */
let chatApiHistory = []; // Mensajes actuales de la sesión para el backend
let activeSessionId = null;

async function sendMsg() {
  const inp = document.getElementById('chat-in');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  appendMsg('user', msg);
  chatApiHistory.push({ role: 'user', content: msg });

  // Typing indicator
  const box    = document.getElementById('chat-msgs');
  const typing = document.createElement('div');
  typing.className = 'msg ai';
  typing.id        = 'typing';
  typing.innerHTML = `<div class="msg-av" style="background:linear-gradient(135deg,var(--a3),var(--a2));color:#000;font-weight:700">✦</div>
    <div class="msg-bubble"><div class="proc-dots" style="padding:2px 0"><span></span><span></span><span></span></div></div>`;
  box.appendChild(typing);
  box.scrollTop = box.scrollHeight;

  try {
    const res = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message:   msg,
        history:   chatApiHistory.slice(-12),
        sessionId: activeSessionId,
        context: {
          students:  window.IE_STUDENTS || [],
          sessionId: activeSessionId,
        },
      }),
    });

    document.getElementById('typing')?.remove();

    if (res) {
      activeSessionId = res.session_id;
      chatApiHistory.push({ role: 'assistant', content: res.content });

      appendMsg('ai', res.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));

      // Guardar en historial local
      saveChat(chatApiHistory);
    }
  } catch (err) {
    document.getElementById('typing')?.remove();
    appendMsg('ai', 'Ameyalli no está disponible en este momento. Verifica que el backend esté corriendo.');
    toast('Error conectando con Ameyalli', 'err');
  }
}

function qmsg(text) {
  document.getElementById('chat-in').value = text;
  sendMsg();
}
```

---

## PASO 6 · Conectar historial de chats con backend

**Reemplaza** la función `newChat()`:

```javascript
async function newChat() {
  activeSessionId   = null;
  chatApiHistory    = [];
  activeChatId      = null;

  const box = document.getElementById('chat-msgs');
  box.innerHTML = '';
  appendMsg('ai', 'Hola, soy <strong>Ameyalli</strong>. Nueva conversación iniciada. ¿En qué te ayudo hoy?');
  renderChatList();
}

/* ── Cargar sesiones desde el backend ── */
async function loadChatSessions() {
  try {
    const res = await api('/ai/sessions');
    if (!res?.sessions) return;

    chatHistory = res.sessions.map(s => ({
      id:    s.session_id,
      title: s.first_user_msg ? s.first_user_msg.slice(0, 45) : 'Conversación',
      date:  new Date(s.last_msg_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      msgs:  [],
    }));

    localStorage.setItem('ie_chats', JSON.stringify(chatHistory));
    renderChatList();
  } catch (err) {
    console.warn('[Chat Sessions] Error cargando del backend, usando localStorage');
    renderChatList();
  }
}

/* ── Eliminar sesión del backend ── */
async function deleteChat(id) {
  try {
    await api(`/ai/sessions/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('[deleteChat] Error en backend:', err.message);
  }

  chatHistory = chatHistory.filter(c => c.id !== id);
  localStorage.setItem('ie_chats', JSON.stringify(chatHistory));

  if (activeChatId === id || activeSessionId === id) {
    newChat();
  }
  renderChatList();
  toast('Chat eliminado', 'ok');
}

/* ── Cargar mensajes de una sesión ── */
async function loadChatHistory(id) {
  try {
    const res = await api(`/ai/sessions/${id}`);
    if (!res?.messages) return;

    activeSessionId = id;
    activeChatId    = id;
    chatApiHistory  = res.messages.map(m => ({ role: m.role, content: m.content }));

    const box = document.getElementById('chat-msgs');
    box.innerHTML = '';
    res.messages.forEach(m => {
      appendMsg(m.role === 'assistant' ? 'ai' : 'user',
        m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));
    });

    renderChatList();
  } catch (err) {
    toast('Error cargando conversación', 'err');
  }
}
```

---

## PASO 7 · Conectar login.html al backend

**El archivo `login.html`** ya tiene la estructura. Solo verifica/agrega:

```javascript
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : 'https://TU-BACKEND.onrender.com/api';

async function doLogin(email, pwd) {
  setLoad(true);
  try {
    const r = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password: pwd }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Error de autenticación');

    const st = document.getElementById('rem')?.checked ? localStorage : sessionStorage;
    st.setItem('ie_token', d.access_token);
    st.setItem('ie_user', JSON.stringify(d.user));

    document.getElementById('success')?.classList.add('show');
    setTimeout(() => location.href = 'app.html', 1200);
  } catch (e) {
    setLoad(false);
    showToast(e.message || 'No se pudo conectar al servidor');
  }
}

// Auth guard: si ya hay token, redirigir directo
(() => {
  const t = localStorage.getItem('ie_token') || sessionStorage.getItem('ie_token');
  if (t) location.href = 'app.html';
})();
```

---

## PASO 8 · Conectar logout

**Reemplaza** la función de logout en `app.html`:

```javascript
async function doLogout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (_) {}
  localStorage.clear();
  sessionStorage.clear();
  location.href = 'login.html';
}
```

Asegura que el botón de logout llama a `doLogout()`:
```html
<button class="logout" onclick="doLogout()" title="Salir">
```

---

## PASO 9 · Conectar import CSV

```javascript
async function importCSV(csvText) {
  try {
    const res = await api('/students/import', {
      method: 'POST',
      body:   JSON.stringify({ csv_data: csvText }),
    });
    toast(`✓ ${res.imported} alumnos importados`, 'ok');
    await loadDashboard(); // Recargar datos
  } catch (err) {
    toast('Error importando CSV: ' + err.message, 'err');
  }
}
```

Agrega un input file en el tab de Alumnos (justo antes del botón "+ Agregar"):
```html
<label class="btn" style="cursor:pointer">
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
    <path d="M8 2v9M4 8l4 4 4-4"/><path d="M2 13h12"/>
  </svg>
  Importar CSV
  <input type="file" accept=".csv" style="display:none" onchange="handleCSVUpload(event)">
</label>
```

```javascript
function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => importCSV(ev.target.result);
  reader.readAsText(file, 'UTF-8');
}
```

---

## PASO 10 · Conectar generación de PDF/Planeación

```javascript
async function generatePlaneacion(materia, grado, tema, duracion = '50 minutos', semanas = 1) {
  toast('Generando planeación con Ameyalli...', 'ok');
  try {
    const res = await api('/reports/pdf/planeacion', {
      method: 'POST',
      body:   JSON.stringify({ materia, grado, tema, duracion, semanas }),
    });

    if (res.html) {
      // Abrir HTML en nueva ventana para imprimir como PDF
      const win = window.open('', '_blank');
      win.document.write(res.html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    toast('✓ Planeación generada — usa Ctrl+P para guardar como PDF', 'ok');
  } catch (err) {
    toast('Error generando planeación: ' + err.message, 'err');
  }
}

async function generateGroupPDF() {
  toast('Generando reporte grupal...', 'ok');
  try {
    const res = await api('/reports/pdf/group', { method: 'POST' });
    if (res.html) {
      const win = window.open('', '_blank');
      win.document.write(res.html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    toast('✓ Reporte grupal listo', 'ok');
  } catch (err) {
    toast('Error: ' + err.message, 'err');
  }
}
```

---

## ✅ CHECKLIST FINAL FRONTEND

```
[ ] Variable API detecta automáticamente local vs producción
[ ] getToken() y getUser() funcionan
[ ] api() wrapper con auth header y redirect en 401
[ ] init() carga dashboard real al iniciar
[ ] loadDashboard() consume GET /api/dashboard
[ ] KPI cards muestran datos reales (no counters mock)
[ ] renderStudents() acepta datos del API
[ ] renderExams() acepta datos del API
[ ] sendMsg() llama a POST /api/ai/chat con history
[ ] deleteChat() llama a DELETE /api/ai/sessions/:id
[ ] loadChatHistory() llama a GET /api/ai/sessions/:id
[ ] doLogout() llama a POST /api/auth/logout
[ ] importCSV() llama a POST /api/students/import
[ ] generatePlaneacion() llama a POST /api/reports/pdf/planeacion
[ ] generateGroupPDF() llama a POST /api/reports/pdf/group
[ ] login.html tiene API variable y doLogin() conectado
[ ] Sidebar muestra nombre real del usuario
```
