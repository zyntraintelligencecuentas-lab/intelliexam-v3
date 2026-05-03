# 📱 MOBILE FIX DEFINITIVO — IntelliExam v3
**Auditor**: Claude Senior | **Ejecutor**: Antigravity  
**Archivo**: `fronted/app.html` — ÚNICO archivo a modificar  
**Urgencia**: CRÍTICA — La app no es usable en móvil/tablet

---

## 🔍 DIAGNÓSTICO EXACTO (lo que encontré en el código)

### Causa raíz #1 — El sidebar SIEMPRE está visible en móvil

```css
/* LÍNEA EXACTA DEL PROBLEMA: */
.app { grid-template-columns: 230px 1fr; height: 100vh; }
```

En un iPhone (390px), el sidebar ocupa 230px = **59% de la pantalla**.  
El contenido solo tiene 160px. **No hay botón hamburguesa. No existe en el código.**

El único media query del archivo:
```css
@media(max-width:900px) {
  .kpi-grid { grid-template-columns: 1fr 1fr }
  .g2,.g3 { grid-template-columns: 1fr }
  .g2e { grid-template-columns: 1fr }
}
/* ← NUNCA OCULTA EL SIDEBAR */
```

### Causa raíz #2 — El chat queda cortado o bajo el teclado

```css
.ai-chat { height: calc(100vh - 145px) }
```

En móvil: el teclado reduce el viewport, los botones rápidos hacen wrap (+100px), el input queda invisible bajo el teclado de iOS/Android.

---

## ✅ PLAN DE EJECUCIÓN (3 pasos, en orden)

```
PASO 1 → Reemplazar el bloque @media en el CSS
PASO 2 → Agregar overlay div en el HTML (1 línea)
PASO 3 → Agregar funciones JS + parchear showTab()
```

---

## PASO 1 — REEMPLAZAR MEDIA QUERIES EN EL CSS

### Ubica esta sección exacta en el `<style>`:

```css
/* Responsive */
@media(max-width:900px){
  .kpi-grid{grid-template-columns:1fr 1fr}
  .g2,.g3{grid-template-columns:1fr}
  .g2e{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;transition-duration:.01ms !important}}
```

### REEMPLAZA TODO ESE BLOQUE CON:

```css
/* ══════════════════════════════════════════
   MOBILE & RESPONSIVE — Fix completo
   ══════════════════════════════════════════ */

/* Botón hamburguesa — oculto en desktop */
.mob-btn {
  display: none;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--gb);
  border-radius: var(--rsm);
  color: var(--tx2);
  padding: 7px 10px;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .14s;
}
.mob-btn:hover { background: var(--s3); color: var(--tx); }

/* Overlay oscuro para cerrar sidebar */
.sb-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  z-index: 25;
  cursor: pointer;
}
.sb-overlay.visible { display: block; }

/* ── Tablet (≤900px) ── */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .g2, .g3  { grid-template-columns: 1fr; }
  .g2e      { grid-template-columns: 1fr; }
  .mob-btn  { display: flex; }
}

/* ── Mobile (≤640px) ── */
@media (max-width: 640px) {

  /* Layout: 1 columna, sidebar sale del flujo */
  .app {
    grid-template-columns: 1fr !important;
  }

  /* Sidebar: drawer desde la izquierda */
  .sb {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    height: 100dvh;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform .28s cubic-bezier(.25,.46,.45,.94);
    box-shadow: none;
  }
  .sb.open {
    transform: translateX(0);
    box-shadow: 6px 0 40px rgba(0,0,0,0.6);
  }

  /* Main: ocupa todo el ancho */
  .main {
    width: 100% !important;
    grid-column: 1 / -1 !important;
  }

  /* Tabs: menos padding */
  .tab { padding: 16px 14px !important; }

  /* Topbar: flex row con hamburguesa al inicio */
  .topbar {
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  .page-title { font-size: 18px !important; }

  /* KPIs: 2 columnas compactas */
  .kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .kpi { padding: 12px 10px; }
  .kv  { font-size: 24px !important; }
  .kl  { font-size: 8px; }

  /* Grids: siempre 1 columna */
  .g2, .g3, .g2e { grid-template-columns: 1fr !important; }

  /* Tablas: scroll horizontal */
  .card { padding: 12px; }
  table { min-width: 480px; display: block; }
  .card:has(table) { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* ── CHAT FIX COMPLETO ── */
  #ai-tab {
    display: flex !important;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
    padding: 14px !important;
  }
  #ai-tab > .topbar  { flex-shrink: 0; }
  #ai-tab > div:nth-child(2) { /* botones rápidos */
    flex-shrink: 0;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
    margin-bottom: 10px !important;
    scrollbar-width: none;
    gap: 6px !important;
  }
  #ai-tab > div:nth-child(2)::-webkit-scrollbar { display: none; }
  #ai-tab > div:nth-child(2) .btn {
    flex-shrink: 0 !important;
    white-space: nowrap !important;
    font-size: 11px !important;
    padding: 6px 10px !important;
  }
  .ai-chat {
    flex: 1 !important;
    height: auto !important;   /* cancela el calc() roto */
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .chat-msgs {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }
  .chat-input-wrap {
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    background: rgba(3,5,10,0.97);
    padding: 10px 0 max(10px, env(safe-area-inset-bottom));
    border-top: 1px solid var(--gb);
    z-index: 5;
    gap: 8px !important;
  }
  /* CRÍTICO iOS: font-size 16px evita zoom automático al hacer foco */
  .chat-input {
    font-size: 16px !important;
    padding: 10px 12px !important;
  }
  .chat-input-wrap .btn-primary {
    padding: 10px 12px !important;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Modal: bottom sheet en móvil */
  .modal-overlay { align-items: flex-end !important; }
  .modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 88dvh !important;
    border-radius: var(--r) var(--r) 0 0 !important;
    margin: 0 !important;
  }

  /* Toast: arriba (no lo tapa el teclado) */
  .toast {
    bottom: auto !important;
    top: 14px !important;
    right: 12px !important;
    left: 12px !important;
    transform: translateY(-80px) !important;
  }
  .toast.show { transform: translateY(0) !important; }
}

/* ── iPhone SE y pantallas muy pequeñas (≤375px) ── */
@media (max-width: 375px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .tab { padding: 12px !important; }
  .kv  { font-size: 20px !important; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

---

## PASO 2 — AGREGAR OVERLAY + BOTÓN HAMBURGUESA EN HTML

### 2A — Agregar el overlay (1 línea)

**Ubica** en el HTML esta línea:
```html
<div class="toast" id="toast"></div>
```

**AGREGA JUSTO DESPUÉS** (una sola línea nueva):
```html
<div class="sb-overlay" id="sb-overlay" onclick="closeSidebar()"></div>
```

---

### 2B — Agregar botón hamburguesa en CADA topbar

Cada tab tiene un topbar con esta estructura:
```html
<div class="topbar">
  <div>
    <div class="page-eyebrow">...</div>
    <div class="page-title">...</div>
  </div>
  <div class="tbr">
    ...botones...
  </div>
</div>
```

**En CADA topbar de TODOS los tabs**, agrega el botón hamburguesa como **primer hijo**:

```html
<div class="topbar">
  <button class="mob-btn" onclick="openSidebar()" aria-label="Abrir menú">☰</button>
  <div>
    <div class="page-eyebrow">...</div>
    <div class="page-title">...</div>
  </div>
  <div class="tbr">
    ...botones sin cambios...
  </div>
</div>
```

**Los 8 tabs que tienen topbar**:
1. `#dashboard-tab`
2. `#students-tab`
3. `#exams-tab`
4. `#scan-tab`
5. `#reports-tab`
6. `#ai-tab`
7. `#analytics-tab`
8. `#settings-tab`

> ⚡ **ATAJO**: En VSCode usa `Ctrl+H` (Find & Replace):
> - **Buscar**: `<div class="topbar">`
> - **Reemplazar**: `<div class="topbar"><button class="mob-btn" onclick="openSidebar()" aria-label="Abrir menú">☰</button>`
> - Click "Replace All"
> - Verifica que se aplicó en los 8 tabs

---

## PASO 3 — AGREGAR / MODIFICAR JAVASCRIPT

### 3A — Agregar funciones openSidebar y closeSidebar

**Ubica** en el `<script>` la función `showTab`:
```javascript
function showTab(name) {
```

**INSERTA ANTES de esa línea** las siguientes funciones:

```javascript
// ══ SIDEBAR MOBILE ══════════════════════════════════
function openSidebar() {
  document.querySelector('.sb').classList.add('open');
  document.getElementById('sb-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.querySelector('.sb').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

// Cerrar con tecla Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});

// ══ VISUAL VIEWPORT — Fix teclado virtual iOS/Android ══
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', function() {
    if (window.innerWidth > 640) return;
    var aiChat = document.querySelector('.ai-chat');
    if (!aiChat) return;
    var vvh = window.visualViewport.height;
    var inputH = document.querySelector('.chat-input-wrap')
      ? document.querySelector('.chat-input-wrap').offsetHeight + 20
      : 80;
    var topH = document.querySelector('#ai-tab .topbar')
      ? document.querySelector('#ai-tab .topbar').offsetHeight + 10
      : 60;
    var quickH = document.querySelector('#ai-tab > div:nth-child(2)')
      ? document.querySelector('#ai-tab > div:nth-child(2)').offsetHeight + 10
      : 55;
    aiChat.style.height = Math.max(200, vvh - topH - quickH - inputH - 30) + 'px';
  });
}
// ════════════════════════════════════════════════════
```

---

### 3B — Parchear showTab() para cerrar sidebar al navegar

**Ubica** la función showTab existente. Debe verse así:
```javascript
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`${name}-tab`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
  });

  if (name === 'students') loadStudents();
  if (name === 'exams') loadExams();
  if (name === 'reports') loadReports();
  if (name === 'settings') loadSettings();
}
```

**REEMPLAZA** con esta versión que cierra el sidebar en móvil:

```javascript
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`${name}-tab`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
  });

  // ← NUEVO: cerrar sidebar en móvil al navegar
  closeSidebar();
  // Scroll al top al cambiar de tab
  var main = document.querySelector('.main');
  if (main) main.scrollTop = 0;

  if (name === 'students') loadStudents();
  if (name === 'exams') loadExams();
  if (name === 'reports') loadReports();
  if (name === 'settings') loadSettings();
}
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Prueba en Chrome DevTools → Toggle device → **iPhone 12 Pro (390×844)**:

```
[ ] El sidebar NO se ve al cargar la app (está oculto)
[ ] El botón ☰ aparece visible en el topbar
[ ] Al presionar ☰ → sidebar se desliza desde la izquierda
[ ] Al presionar el overlay oscuro → sidebar se cierra
[ ] Al tocar cualquier item del menú → sidebar se cierra solo
[ ] El contenido del tab ocupa TODO el ancho (no 160px)
[ ] Tab "IA Docente": botones rápidos tienen scroll horizontal
[ ] El input del chat es visible al hacer foco (no lo tapa el teclado)
[ ] Escribir en el chat y presionar Enviar funciona
[ ] El modal de agregar alumno sale desde abajo (bottom sheet)
[ ] El toast aparece ARRIBA (no lo tapa el teclado)
```

Prueba en **Tablet (768px)**:
```
[ ] El botón ☰ aparece en tablet también
[ ] El sidebar funciona igual que en móvil (drawer)
[ ] Los KPIs están en 2 columnas (no 4)
```

Prueba en **Desktop (1280px)**:
```
[ ] El sidebar está visible sin hamburguesa
[ ] El botón ☰ NO aparece
[ ] Todo funciona igual que antes
```

---

## TESTING EN PRODUCCIÓN

```
URL: https://intelliexam-v3-production.up.railway.app

1. Login con: demo@intelliexam.com / Demo1234
2. Abre en el celular real de la maestra
3. Verifica sidebar oculto → ☰ funciona
4. Ve al tab "IA Docente" → escribe un mensaje
5. Confirma que el input no queda bajo el teclado
```

---

## NOTAS TÉCNICAS

- `100dvh` = Dynamic Viewport Height (moderno). En iOS Safari el 100vh clásico incluye la barra de URL causando overflow. `dvh` lo resuelve. Soporte: iOS 15.4+, Chrome 108+, Firefox 101+.
- `env(safe-area-inset-bottom)` = padding para el home indicator de iPhone con notch/Dynamic Island. Sin esto el input queda bajo la barra del sistema.
- `font-size: 16px` en el input es **obligatorio en iOS** — si el tamaño es menor, Safari hace zoom automático al enfocar, rompiendo el layout.
- `visualViewport` API detecta cuándo aparece el teclado virtual. El `window.resize` normal no lo detecta en iOS.
- El `z-index: 30` del sidebar es mayor que los orbs (z-index: 10) y menor que los modales (z-index: 30) — ajustar si hay conflictos.

---

*Fix auditado y documentado por Claude Senior — Zyntra Intelligence*  
*Mayo 2026 — Aplicar en `fronted/app.html`*
