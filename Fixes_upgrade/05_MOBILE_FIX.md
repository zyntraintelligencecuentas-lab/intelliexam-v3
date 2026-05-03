# 📱 MOBILE FIX — IntelliExam v3
**Auditor Senior**: Claude (Zyntra Intelligence)  
**Ejecutor**: Antigravity  
**Archivos a modificar**: `fronted/app.html` únicamente  
**Regla**: Solo corriges lo que está en este archivo. Diseño intocable.

---

## 🔍 DIAGNÓSTICO: POR QUÉ FALLA EN MÓVIL

### PROBLEMA 1 — El sidebar NUNCA desaparece en móvil

**Root cause**: El único media query del archivo (`@media(max-width:900px)`) solo cambia grids de KPIs. **No hace nada con el sidebar**.

El `.app` tiene `grid-template-columns: 230px 1fr` fijo. En un iPhone de 390px, el sidebar ocupa 230px y el contenido solo tiene 160px — inutilizable. Además **no existe ningún botón hamburguesa** ni lógica de toggle.

**Resultado**: En celular el menú empuja el contenido y no hay forma de cerrarlo.

---

### PROBLEMA 2 — El chat de IA queda cortado o invisible en móvil

**Root cause**: `.ai-chat` tiene `height: calc(100vh - 145px)`. Ese cálculo asume que el topbar + tabs miden exactamente 145px, lo cual es correcto en desktop pero en móvil:

1. El teclado virtual reduce el `100vh` pero no notifica al CSS legacy
2. Los botones de acceso rápido se hacen `flex-wrap` y agregan 80-120px extra de altura
3. La suma hace que `.chat-input-wrap` quede **debajo del fold** o bajo el teclado virtual

**Resultado**: El input del chat no se ve o no es accesible en móvil.

---

## ✅ QUÉ HARÁS (en orden exacto)

```
1. Agregar botón hamburguesa en el topbar de cada tab
2. Agregar overlay de cierre del sidebar
3. Reescribir los media queries móvil del CSS
4. Agregar JS de toggle sidebar
5. Parchear showTab() para cerrar sidebar en móvil
6. Fijar el chat input para que sea sticky en móvil
7. Manejar el teclado virtual (visualViewport API)
```

---

## MODIFICACIÓN 1 — Agregar CSS mobile completo

**Ubica** en `app.html` esta línea exacta:
```css
@media(max-width:900px){
  .kpi-grid{grid-template-columns:1fr 1fr}
  .g2,.g3{grid-template-columns:1fr}
  .g2e{grid-template-columns:1fr}
}
```

**REEMPLAZA** con:
```css
/* ════════════════════════════════════
   MOBILE — Breakpoints completos
   ════════════════════════════════════ */

/* ── Botón hamburguesa ── */
.mob-menu-btn {
  display: none;
  background: var(--s1);
  border: 1px solid var(--gb);
  border-radius: var(--rsm);
  color: var(--tx2);
  padding: 8px 10px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: all .14s;
  flex-shrink: 0;
}
.mob-menu-btn:hover { background: var(--s2); color: var(--tx); }

/* ── Overlay para cerrar sidebar ── */
.sb-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(3px);
  z-index: 25;
}
.sb-overlay.open { display: block; }

/* ── Tablet (900px) ── */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .g2, .g3 { grid-template-columns: 1fr; }
  .g2e { grid-template-columns: 1fr; }
  .mob-menu-btn { display: flex; align-items: center; justify-content: center; }
}

/* ── Mobile (640px) ── */
@media (max-width: 640px) {
  /* Sidebar: oculto por defecto, slide-in al abrir */
  .app {
    grid-template-columns: 1fr;
    position: relative;
  }

  .sb {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    height: 100dvh; /* dynamic viewport height */
    z-index: 30;
    transform: translateX(-100%);
    transition: transform .25s cubic-bezier(.22,1,.36,1);
    overflow-y: auto;
  }

  .sb.open {
    transform: translateX(0);
    box-shadow: 8px 0 40px rgba(0,0,0,.5);
  }

  /* Topbar: hacer flex row con botón hamburguesa */
  .topbar {
    flex-direction: row !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }

  .mob-menu-btn { display: flex; }

  /* Tabs: menos padding */
  .tab { padding: 16px !important; }

  /* KPIs: 1 columna en mobile */
  .kpi-grid { grid-template-columns: 1fr 1fr; }

  /* Grids: siempre 1 columna */
  .g2, .g3, .g2e { grid-template-columns: 1fr; }

  /* Cards: menos padding */
  .card { padding: 14px; }
  .kpi  { padding: 14px; }

  /* Tabla: scroll horizontal */
  table { min-width: 520px; }
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--rsm);
  }

  /* Chat: fix crítico para móvil */
  .ai-chat {
    display: flex;
    flex-direction: column;
    height: auto !important;        /* override el calc() roto */
    min-height: 0;
    flex: 1;
  }

  /* El contenedor del tab AI necesita flex */
  #ai-tab {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 16px);
    overflow: hidden;
  }

  #ai-tab .topbar { flex-shrink: 0; }

  /* Botones rápidos: scroll horizontal en vez de wrap */
  #ai-tab > div:nth-child(2) {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 6px;
    margin-bottom: 12px !important;
    scrollbar-width: none;
  }
  #ai-tab > div:nth-child(2)::-webkit-scrollbar { display: none; }
  #ai-tab > div:nth-child(2) .btn { flex-shrink: 0; white-space: nowrap; }

  .chat-msgs {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  /* Input sticky: siempre visible encima del teclado */
  .chat-input-wrap {
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    background: rgba(5,9,18,0.97);
    padding: 10px 0 max(10px, env(safe-area-inset-bottom));
    border-top: 1px solid var(--gb);
    gap: 8px;
    z-index: 5;
  }

  .chat-input {
    font-size: 16px !important; /* evita zoom en iOS */
    min-height: 44px;
    padding: 10px 12px;
  }

  /* Botón enviar más compacto */
  .chat-input-wrap .btn-primary {
    padding: 10px 14px !important;
    min-height: 44px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Modal: full-screen en móvil */
  .modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 92dvh !important;
    border-radius: var(--r) var(--r) 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
    margin: 0 !important;
  }

  .modal-overlay { align-items: flex-end !important; }

  /* Toast: arriba en móvil (evita teclado) */
  .toast {
    bottom: auto !important;
    top: 16px !important;
    right: 12px !important;
    left: 12px !important;
    transform: translateY(-80px) !important;
  }
  .toast.show { transform: translateY(0) !important; }
}

/* ── Small mobile (390px iPhone) ── */
@media (max-width: 430px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .kpi-val  { font-size: 26px !important; }
  .page-title { font-size: 18px !important; }
  .kpi { padding: 12px; }

  /* Ocultar labels de nav en sidebar para más espacio */
  .tab { padding: 12px !important; }
}

/* ── Accesibilidad ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

---

## MODIFICACIÓN 2 — Agregar overlay div al HTML

**Ubica** en el HTML justo **antes** de `<div class="app">`:
```html
<!-- BG -->
<canvas id="bg"></canvas>
<div class="orb o1"></div>
```

**Agrega justo después de los orbs, antes de `<div class="app">`**:
```html
<!-- Mobile sidebar overlay -->
<div class="sb-overlay" id="sb-overlay" onclick="closeSidebar()"></div>
```

---

## MODIFICACIÓN 3 — Agregar botón hamburguesa en cada topbar

Cada tab tiene un `<div class="topbar">` con esta estructura:
```html
<div class="topbar">
  <div>
    <div class="page-eyebrow">...</div>
    <div class="page-title">...</div>
  </div>
  <div style="display:flex;gap:8px">
    <!-- botones -->
  </div>
</div>
```

**En CADA topbar**, agrega el botón hamburguesa como primer elemento:

```html
<div class="topbar">
  <button class="mob-menu-btn" onclick="openSidebar()" aria-label="Abrir menú">☰</button>
  <div>
    <div class="page-eyebrow">...</div>
    <div class="page-title">...</div>
  </div>
  <div style="display:flex;gap:8px">
    <!-- botones existentes sin cambios -->
  </div>
</div>
```

**Son 8 tabs** con topbar:
- `#dashboard-tab`
- `#students-tab`
- `#exams-tab`
- `#scan-tab`
- `#reports-tab`
- `#ai-tab`
- `#analytics-tab`
- `#settings-tab`

> ⚡ TIP: En el editor usa Find & Replace para `<div class="topbar">` → `<div class="topbar"><button class="mob-menu-btn" onclick="openSidebar()" aria-label="Abrir menú">☰</button>` — aplica a todos de una vez.

---

## MODIFICACIÓN 4 — Agregar clase `.table-wrap` a todas las tablas

Busca todas las tablas de la app. Cada una que esté directamente en un `.card` necesita estar envuelta:

**Busca**:
```html
<table ...>
```

**En cada card que contenga tabla, envuelve así**:
```html
<div class="table-wrap">
  <table ...>
    ...
  </table>
</div>
```

Las tablas con datos dinámicos (`#tbody-s`, tabla de exámenes, tabla de reportes) también.

---

## MODIFICACIÓN 5 — JS: funciones de sidebar mobile

**Ubica** en el `<script>` la función `showTab`:
```javascript
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  ...
```

**ANTES de `showTab`, agrega** estas funciones nuevas:

```javascript
// ── Sidebar mobile toggle ──────────────────────────────
function openSidebar() {
  document.querySelector('.sb').classList.add('open');
  document.getElementById('sb-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.querySelector('.sb').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Cerrar con tecla Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSidebar();
});

// ── Visual Viewport API: fix para teclado virtual iOS/Android ──
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const chatWrap = document.querySelector('.ai-chat');
    if (!chatWrap) return;
    // Solo aplica en móvil
    if (window.innerWidth > 640) return;

    const viewportHeight = window.visualViewport.height;
    const tabHeight      = document.getElementById('ai-tab')?.offsetTop || 0;
    chatWrap.style.height = `${viewportHeight - tabHeight - 120}px`;
  });
}
```

**MODIFICA `showTab`** para cerrar sidebar en móvil al navegar:

```javascript
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`${name}-tab`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
  });

  // NUEVO: cerrar sidebar al navegar en móvil
  closeSidebar();
  // Scroll al top del contenido en móvil
  if (window.innerWidth <= 640) {
    document.querySelector('.main')?.scrollTo(0, 0);
  }

  if (name === 'students') loadStudents();
  if (name === 'exams') loadExams();
  if (name === 'reports') loadReports();
  if (name === 'settings') loadSettings();
}
```

---

## MODIFICACIÓN 6 — Fix específico del chat AI en el HTML

El `#ai-tab` actualmente tiene esta estructura:
```html
<div id="ai-tab" class="tab">
  <div class="topbar">...</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
    <!-- botones rápidos -->
  </div>
  <div class="ai-chat">
    <div class="chat-msgs" id="chat-msgs">...</div>
    <div class="chat-input-wrap">...</div>
  </div>
</div>
```

**NO cambies el HTML del chat**. El CSS de la Modificación 1 ya lo maneja.

**SÍ agrega** `inputmode="text"` y `autocomplete="off"` al input del chat para mejor UX en móvil:

**Busca**:
```html
<input class="chat-input" id="chat-input" type="text" placeholder="Pregunta sobre tu grupo, alumnos o temas..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg()}">
```

**REEMPLAZA CON**:
```html
<input 
  class="chat-input" 
  id="chat-input" 
  type="text" 
  inputmode="text"
  autocomplete="off"
  autocorrect="off"
  autocapitalize="sentences"
  placeholder="Pregunta a Ameyalli..." 
  onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg()}"
>
```

---

## VERIFICACIÓN — Checklist antes de hacer commit

```
[ ] Abre en Chrome DevTools → modo iPhone 12 Pro (390×844)
[ ] Sidebar NO se ve al cargar la app
[ ] Botón ☰ visible en cada tab en mobile
[ ] Al presionar ☰ → sidebar hace slide-in desde la izquierda
[ ] Al presionar el overlay oscuro → sidebar se cierra
[ ] Al hacer click en cualquier nav-item → sidebar se cierra solo
[ ] Tab de "IA Docente": los botones de acceso rápido tienen scroll horizontal (no se rompe el layout)
[ ] Input del chat SIEMPRE está visible al hacer foco (no lo tapa el teclado)
[ ] Enviar mensaje con Enter funciona en móvil
[ ] El chat-msgs hace scroll y el input no se mueve
[ ] Modal de "Agregar alumno" sale desde abajo en móvil (bottom sheet)
[ ] Toast aparece ARRIBA en móvil (no debajo del teclado)
[ ] Las tablas tienen scroll horizontal en móvil
[ ] Abre en iPhone real o BrowserStack: verificar Safari iOS
[ ] Sin console.errors en mobile
```

---

## TESTING RÁPIDO

```bash
# Iniciar servidor local
npm run dev

# Abrir en browser y simular mobile
# Chrome: F12 → Toggle device toolbar → iPhone 12 Pro

# URL local de prueba:
http://localhost:3001

# O si el frontend está separado:
# abrir fronted/app.html directamente en browser con simulación móvil
```

**Credenciales demo**:
```
Email:    demo@intelliexam.com
Password: Demo1234
```

---

## NOTAS TÉCNICAS PARA ANTIGRAVITY

- `100dvh` (dynamic viewport height) es el estándar moderno para móvil — evita el bug de iOS con la barra de URL. Safari 15.4+ lo soporta. Para fallback, el `height: 100vh` original sigue ahí primero.
- `env(safe-area-inset-bottom)` agrega padding en iPhones con notch/Dynamic Island para que el input no quede bajo el home indicator.
- `font-size: 16px` en el input es crítico en iOS — si es menor, Safari hace zoom automático al hacer foco, rompiendo el layout.
- `visualViewport` API detecta el resize real del viewport cuando aparece el teclado virtual (iOS/Android), algo que `window.resize` no hace correctamente.
- El `z-index: 30` del sidebar mobile debe ser mayor que los orbs (`z-index: var(--z1)`) pero puede coexistir con modales (`var(--z3)` que debe ser ≥ 31).

---

*Auditoría: Claude Senior — Zyntra Intelligence*  
*Mayo 2026*
