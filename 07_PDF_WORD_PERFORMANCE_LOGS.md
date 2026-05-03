# 🛠️ FIX MAESTRO — PDF · Word · Performance · Tablet · Logs
**Auditor Senior**: Claude (Zyntra Intelligence) | **Ejecutor**: Antigravity  
**Fecha**: Mayo 2026 | **Archivos involucrados**: 4 archivos

---

## 🔍 DIAGNÓSTICO COMPLETO

### PROBLEMA 1 — PDF sale como texto plano sin formato

**Root cause exacto**: El backend genera HTML correcto con estilos (`pdf.service.js` tiene CSS profesional), pero el frontend **NUNCA llama al endpoint `/api/reports/pdf/planeacion`**. Los botones en `#reports-tab` llaman a `generateReport('group','...')` que solo crea un registro en la DB — nunca abre una ventana de impresión.

El botón "↓ PDF" en la tabla de reportes hace `onclick="toast('Descargando PDF...','ok')"` — **es un toast falso, no descarga nada**.

La maestra está usando el sistema de imprimir directamente desde el browser sobre texto plano (el contenido `ai_content` del examen sin HTML), de ahí el texto sin formato que vemos en la imagen.

### PROBLEMA 2 — Archivos Word se abren dañados

**Root cause exacto**: No existe ninguna librería para generar DOCX en el backend (`package.json` no tiene `docx`, `officegen`, ni `docxtemplater`). El examen se guarda como texto plano en `content` (TEXT en Turso). Cuando el frontend "descarga el Word", en realidad no existe ese endpoint — es un `toast()` falso también.

### PROBLEMA 3 — Interfaz lenta

**Root cause exacto**: 
- Las partículas canvas (`#bg`) animan 50+ puntos con `requestAnimationFrame` en el hilo principal
- Cada cambio de tab re-dibuja todo desde cero sin cache
- `loadDashboard()` hace múltiples fetches secuenciales (no paralelos)
- Sin `will-change` en elementos animados — el browser recalcula paint en cada frame

### PROBLEMA 4 — Tablets con problemas

**Root cause exacto**: El único breakpoint es `@media(max-width:900px)` que solo cambia grids. No hay layout para 768px-900px (iPad). El sidebar de 230px más el padding de 32px del `.tab` consume demasiado espacio para pantallas de 768px.

### PROBLEMA 5 — Sin sistema de logs

**Root cause exacto**: No existe middleware de logging. Los `console.error` no tienen estructura, timestamp ni persistencia. Imposible diagnosticar errores en producción en Railway.

---

## 📁 ARCHIVOS A MODIFICAR

```
1. fronted/app.html                          ← PDF real + Word + Performance + Tablet
2. src/services/pdf.service.js               ← Función generateExamHTML (nueva)
3. src/controllers/exams.controller.js       ← Endpoint descarga DOCX real
4. src/middleware/logger.js                  ← CREAR NUEVO — sistema de logs
5. server.js                                 ← Registrar logger middleware
6. package.json                              ← Agregar dependencia docx
```

---

## FIX 1 — PDF PROFESIONAL DE EXÁMENES

### 1A — Agregar función `generateExamHTML` en `pdf.service.js`

**Agrega al FINAL del archivo** `src/services/pdf.service.js`:

```javascript
// ── Generar HTML de examen con formato profesional ──────────────────────────
exports.generateExamHTML = (data) => {
  const { content, title, subject, groupName, teacher, totalItems, examType } = data;
  const date = new Date().toLocaleDateString('es-MX', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  // Parser de texto plano del examen a HTML estructurado
  const parseExamContent = (raw) => {
    if (!raw) return '<p>Sin contenido</p>';
    
    const lines = raw.split('\n').filter(l => l.trim());
    let html = '';
    let inOptions = false;
    let qNumber   = 0;

    for (const line of lines) {
      const t = line.trim();

      // Encabezado del examen (====)
      if (t.startsWith('===') || t.startsWith('---')) continue;

      // Instrucciones / bloques de texto con **
      if (t.startsWith('**') && t.endsWith('**')) {
        html += `<div class="exam-instruction">${t.replace(/\*\*/g,'')}</div>`;
        continue;
      }

      // Pregunta numerada: "1." o "1)"
      const qMatch = t.match(/^(\d+)[.)]\s+(.+)/);
      if (qMatch) {
        qNumber++;
        inOptions = true;
        html += `
          <div class="exam-question">
            <div class="q-number">${qMatch[1]}</div>
            <div class="q-body">
              <div class="q-text">${qMatch[2]}</div>
              <div class="q-options" id="opts-${qNumber}">`;
        continue;
      }

      // Opción: "a)" "b)" "c)" "d)"
      const optMatch = t.match(/^([a-dA-D])[).]\s+(.+)/);
      if (optMatch && inOptions) {
        html += `<div class="q-option">
          <span class="opt-letter">${optMatch[1].toUpperCase()}</span>
          <span class="opt-text">${optMatch[2]}</span>
        </div>`;
        // Espacio para respuesta abierta al final de cada opción d)
        if (optMatch[1].toLowerCase() === 'd') {
          html += `</div><div class="q-answer-line"></div></div></div>`;
          inOptions = false;
        }
        continue;
      }

      // Línea de respuesta abierta o espacio en blanco
      if (t.startsWith('R:') || t.startsWith('Respuesta:')) {
        html += `<div class="q-answer-open">${t}</div>`;
        if (inOptions) { html += '</div></div></div>'; inOptions = false; }
        continue;
      }

      // Acción de seguimiento u otro texto
      if (t && !inOptions) {
        html += `<p class="exam-note">${t}</p>`;
      }
    }

    // Cerrar pregunta si quedó abierta
    if (inOptions) html += '</div><div class="q-answer-line"></div></div></div>';

    return html;
  };

  const examCSS = `
    ${PDF_STYLES}
    /* ── Exam specific ── */
    .exam-header {
      background: #0a1628;
      color: white;
      padding: 28px 40px;
      margin: -40px -50px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .exam-header-left h1 { font-size: 20pt; font-weight: 800; margin-bottom: 4px; color: #fff; }
    .exam-header-left p  { font-size: 10pt; color: rgba(255,255,255,0.55); }
    .exam-header-right   { text-align: right; }
    .exam-header-right .school { font-size: 9pt; color: rgba(255,255,255,0.5); }
    .exam-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    .exam-meta-item {
      padding: 10px 16px;
      border-right: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .exam-meta-item:last-child { border-right: none; }
    .exam-meta-label { font-size: 7.5pt; letter-spacing: .1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; }
    .exam-meta-value { font-size: 11pt; font-weight: 600; color: #1a1a2e; }
    .exam-student-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 24px;
      display: flex;
      gap: 40px;
    }
    .exam-student-field { flex: 1; }
    .exam-student-label { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .exam-student-line  { border-bottom: 1.5px solid #cbd5e1; height: 24px; }
    .exam-instruction {
      background: rgba(0,136,255,0.06);
      border-left: 3px solid #3b82f6;
      padding: 10px 16px;
      border-radius: 0 6px 6px 0;
      margin: 16px 0;
      font-size: 10.5pt;
      color: #1e40af;
      font-weight: 500;
    }
    .exam-question {
      display: flex;
      gap: 14px;
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    .q-number {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #0a1628;
      color: white;
      font-size: 10pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .q-body  { flex: 1; }
    .q-text  { font-size: 11pt; font-weight: 500; color: #1a1a2e; margin-bottom: 10px; line-height: 1.5; }
    .q-options { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
    .q-option {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #fafafa;
    }
    .opt-letter {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1.5px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 600;
      color: #475569;
      flex-shrink: 0;
    }
    .opt-text     { font-size: 10.5pt; color: #374151; line-height: 1.4; }
    .q-answer-line {
      border-bottom: 1.5px solid #cbd5e1;
      margin: 8px 0 4px;
      height: 28px;
    }
    .q-answer-open {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      min-height: 60px;
      margin: 8px 0;
      font-size: 9pt;
      color: #94a3b8;
    }
    .exam-note  { font-size: 9.5pt; color: #64748b; font-style: italic; margin: 8px 0; }
    .exam-footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 2px solid #0a1628;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }
    .score-box {
      border: 1.5px solid #0a1628;
      border-radius: 8px;
      padding: 8px 20px;
      font-weight: 700;
      color: #0a1628;
      font-size: 10pt;
    }
    @media print {
      .exam-header { margin: -20px -30px 24px; padding: 20px 30px; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${subject} — ${title}</title>
  <style>${examCSS}</style>
</head>
<body>
  <div class="page">
    <!-- ENCABEZADO -->
    <div class="exam-header">
      <div class="exam-header-left">
        <h1>${subject}</h1>
        <p>${title} · ${examType || 'Opción Múltiple'} · ${totalItems || 20} reactivos</p>
      </div>
      <div class="exam-header-right">
        <div style="font-size:11pt;font-weight:700;color:#00f0ff">${teacher?.school || 'IntelliExam'}</div>
        <div class="school">Ciclo ${new Date().getFullYear()}–${new Date().getFullYear()+1}</div>
        <div class="school" style="margin-top:6px">${date}</div>
      </div>
    </div>

    <!-- META -->
    <div class="exam-meta">
      <div class="exam-meta-item">
        <div class="exam-meta-label">Materia</div>
        <div class="exam-meta-value">${subject}</div>
      </div>
      <div class="exam-meta-item">
        <div class="exam-meta-label">Grado</div>
        <div class="exam-meta-value">${teacher?.grade || groupName || '—'}</div>
      </div>
      <div class="exam-meta-item">
        <div class="exam-meta-label">Tipo</div>
        <div class="exam-meta-value">${examType || 'Opción Múltiple'}</div>
      </div>
      <div class="exam-meta-item">
        <div class="exam-meta-label">Reactivos</div>
        <div class="exam-meta-value">${totalItems || 20}</div>
      </div>
    </div>

    <!-- DATOS DEL ALUMNO -->
    <div class="exam-student-box">
      <div class="exam-student-field">
        <div class="exam-student-label">Nombre del alumno</div>
        <div class="exam-student-line"></div>
      </div>
      <div class="exam-student-field" style="max-width:140px">
        <div class="exam-student-label">N° lista</div>
        <div class="exam-student-line"></div>
      </div>
      <div class="exam-student-field" style="max-width:140px">
        <div class="exam-student-label">Fecha</div>
        <div class="exam-student-line"></div>
      </div>
    </div>

    <!-- PREGUNTAS -->
    ${parseExamContent(content)}

    <!-- FOOTER -->
    <div class="exam-footer">
      <span>IntelliExam · Generado por Ameyalli IA · ${teacher?.full_name || 'Docente'}</span>
      <div class="score-box">Calificación: _______ / 10</div>
    </div>
  </div>
</body>
</html>`;
};
```

---

### 1B — Agregar endpoint de descarga de examen en PDF

**Archivo**: `src/routes/exams.routes.js`

**Agrega esta ruta** (antes del `module.exports`):

```javascript
// Descargar examen como HTML-PDF
router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const { turso }      = require('../config/turso');
    const pdfService     = require('../services/pdf.service');

    const examRes = await turso.execute({
      sql: `SELECT * FROM exams WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });
    if (!examRes.rows.length) return res.status(404).json({ error: 'Examen no encontrado' });

    const exam = examRes.rows[0];

    const teacherRes = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    const teacher = teacherRes.rows[0] || {};

    const html = pdfService.generateExamHTML({
      content:    exam.content,
      title:      exam.title,
      subject:    exam.subject,
      groupName:  exam.group_name,
      teacher,
      totalItems: exam.total_items,
      examType:   exam.exam_type || 'Opción Múltiple',
    });

    res.json({ html, exam_id: exam.id, title: exam.title, subject: exam.subject });
  } catch (err) { next(err); }
});
```

---

### 1C — Conectar el botón PDF en el frontend

**Archivo**: `fronted/app.html`

**Agrega esta función JS** (antes de `sendMsg`):

```javascript
async function downloadExamPDF(examId, title) {
  try {
    toast('Generando PDF...', 'ok');
    const data = await api(`/exams/${examId}/pdf`);
    if (!data?.html) throw new Error('Sin HTML');

    const win = window.open('', '_blank');
    if (!win) {
      toast('Permite popups para descargar el PDF', 'err');
      return;
    }
    win.document.write(data.html);
    win.document.close();
    win.focus();
    // Esperar que carguen fuentes antes de imprimir
    setTimeout(() => win.print(), 800);
    toast(`✓ PDF de "${title}" listo — usa Ctrl+P / Guardar como PDF`, 'ok');
  } catch (err) {
    toast('Error generando PDF: ' + err.message, 'err');
  }
}
```

**Actualiza** la función `loadExams()` — cambia la columna de acciones en el `tbody`:

**Busca**:
```javascript
return `<tr>
      <td style="color:var(--tx)">${e.title}</td>
      ...
      <td style="font-family:var(--mono);font-size:11px">${avg}</td>
    </tr>`;
```

**REEMPLAZA** con (agrega columna de acciones):
```javascript
return `<tr>
      <td style="color:var(--tx)">${e.title}</td>
      <td><span class="badge bc">${e.subject}</span></td>
      <td>${e.group_name}</td>
      <td style="font-family:var(--mono);font-size:10.5px">${date}</td>
      <td><span class="badge ${stClass}">${stTxt}</span></td>
      <td style="font-family:var(--mono);font-size:11px">${avg}</td>
      <td>
        <button class="btn" style="font-size:10px;padding:3px 8px;min-height:28px"
          onclick="downloadExamPDF('${e.id}','${e.title.replace(/'/g,"\\'")}')">
          ↓ PDF
        </button>
      </td>
    </tr>`;
```

**Actualiza también el `<thead>`** de la tabla de exámenes para agregar columna:
```html
<thead>
  <tr>
    <th>Título</th><th>Materia</th><th>Grupo</th>
    <th>Fecha</th><th>Estado</th><th>Promedio</th><th></th>
  </tr>
</thead>
```

---

## FIX 2 — ARCHIVOS WORD (.docx) FUNCIONALES

### 2A — Instalar librería docx

**Ejecuta en la carpeta del backend**:
```bash
npm install docx
```

**Verifica en `package.json`** que aparezca:
```json
"docx": "^8.x.x"
```

---

### 2B — Agregar endpoint de descarga Word en `exams.routes.js`

**Agrega esta ruta** (después de la ruta `/pdf`):

```javascript
// Descargar examen como Word (.docx)
router.get('/:id/docx', requireAuth, async (req, res, next) => {
  try {
    const { turso } = require('../config/turso');
    const {
      Document, Paragraph, TextRun, HeadingLevel,
      AlignmentType, BorderStyle, Table, TableRow,
      TableCell, WidthType, Packer
    } = require('docx');

    const examRes = await turso.execute({
      sql: `SELECT * FROM exams WHERE id = ? AND teacher_id = ?`,
      args: [req.params.id, req.user.id],
    });
    if (!examRes.rows.length) return res.status(404).json({ error: 'No encontrado' });
    const exam = examRes.rows[0];

    const teacherRes = await turso.execute({
      sql: `SELECT * FROM profiles WHERE id = ?`,
      args: [req.user.id],
    });
    const teacher = teacherRes.rows[0] || {};

    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    // Parsear líneas del examen
    const lines = (exam.content || '').split('\n').filter(l => l.trim());
    const children = [];

    // Portada / encabezado
    children.push(
      new Paragraph({
        children: [new TextRun({ text: exam.subject.toUpperCase(), bold: true, size: 36, color: '0a1628' })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: exam.title, size: 26, color: '374151' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Escuela: ${teacher.school || '—'}  |  Grado: ${teacher.grade || '—'}  |  Fecha: ${date}`, size: 18, color: '94a3b8' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Nombre: _____________________________________    N° lista: _____    Fecha: _____________', size: 20, color: '475569' })],
        spacing: { after: 400 },
        border: { bottom: { color: 'cbd5e1', style: BorderStyle.SINGLE, size: 6 } },
      }),
    );

    // Parsear preguntas
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('===') || t.startsWith('---')) continue;

      // Pregunta numerada
      const qMatch = t.match(/^(\d+)[.)]\s+(.+)/);
      if (qMatch) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${qMatch[1]}. `, bold: true, size: 22, color: '0a1628' }),
            new TextRun({ text: qMatch[2], size: 22, color: '1a1a2e' }),
          ],
          spacing: { before: 240, after: 80 },
          keepLines: true,
        }));
        continue;
      }

      // Opción de respuesta
      const optMatch = t.match(/^([a-dA-D])[).]\s+(.+)/);
      if (optMatch) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `    ${optMatch[1].toUpperCase()})  `, size: 20, color: '475569' }),
            new TextRun({ text: optMatch[2], size: 20, color: '374151' }),
          ],
          spacing: { after: 60 },
          indent: { left: 360 },
        }));
        continue;
      }

      // Texto de instrucción o nota
      if (t.startsWith('**') && t.endsWith('**')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: t.replace(/\*\*/g,''), bold: true, size: 20, color: '1e40af' })],
          spacing: { before: 200, after: 100 },
        }));
        continue;
      }

      // Texto genérico
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 20, color: '374151' })],
        spacing: { after: 80 },
      }));
    }

    // Pie de página
    children.push(
      new Paragraph({ children: [], spacing: { before: 600 } }),
      new Paragraph({
        children: [
          new TextRun({ text: 'IntelliExam · Generado por Ameyalli IA · ', size: 16, color: '94a3b8' }),
          new TextRun({ text: teacher.full_name || 'Docente', size: 16, color: '64748b' }),
        ],
        alignment: AlignmentType.CENTER,
        border: { top: { color: '0a1628', style: BorderStyle.SINGLE, size: 6 } },
        spacing: { before: 200 },
      }),
    );

    const doc = new Document({
      creator:     'IntelliExam',
      title:       exam.title,
      description: `Examen generado por Ameyalli IA — ${exam.subject}`,
      sections: [{
        properties: {
          page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeTitle = (exam.title || 'examen').replace(/[^a-zA-Z0-9\-_ÁáÉéÍíÓóÚúÑñ ]/g,'').replace(/\s+/g,'-');

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safeTitle}.docx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) { next(err); }
});
```

---

### 2C — Agregar botón Word en el frontend

**En la función `loadExams()`**, actualiza el botón de acciones para incluir Word:

```javascript
// Reemplaza solo la celda de acciones (última <td>):
<td style="display:flex;gap:4px">
  <button class="btn" style="font-size:10px;padding:3px 8px;min-height:28px"
    onclick="downloadExamPDF('${e.id}','${e.title.replace(/'/g,"\\'")}')">
    ↓ PDF
  </button>
  <button class="btn" style="font-size:10px;padding:3px 8px;min-height:28px"
    onclick="downloadExamDOCX('${e.id}','${e.title.replace(/'/g,"\\'")}')">
    ↓ Word
  </button>
</td>
```

**Agrega función JS** junto a `downloadExamPDF`:
```javascript
async function downloadExamDOCX(examId, title) {
  try {
    toast('Generando Word...', 'ok');
    const token = getToken();
    const res   = await fetch(`${API}/exams/${examId}/docx`, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('Error ' + res.status);

    const blob     = await res.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `${title.replace(/[^a-zA-Z0-9\s]/g,'')}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast('✓ Word descargado correctamente', 'ok');
  } catch (err) {
    toast('Error descargando Word: ' + err.message, 'err');
  }
}
```

---

## FIX 3 — PERFORMANCE: INTERFAZ MÁS FLUIDA

**Archivo**: `fronted/app.html` — solo dentro del `<script>` y `<style>`

### 3A — CSS: agregar will-change y optimizaciones

**Agrega al final del `<style>`** (antes del cierre `</style>`):

```css
/* ── Performance optimizations ── */
.orb          { will-change: transform; }
.kpi::before  { will-change: left; }
.nav-item     { will-change: background-color; }
.card         { will-change: border-color; }
.sb           { will-change: transform; }  /* para mobile slide */

/* Reducir animaciones en tabs no activos */
.tab:not(.active) .orb,
.tab:not(.active) .kpi::before { animation-play-state: paused; }

/* GPU layers para elementos de scroll */
.main         { -webkit-overflow-scrolling: touch; transform: translateZ(0); }
.chat-msgs    { transform: translateZ(0); }
```

### 3B — JS: reducir partículas y throttle del canvas

**Busca** en el `<script>` donde se inicializan las partículas (función con `requestAnimationFrame` y el canvas `#bg`).

**Agrega justo ANTES de la función de animación del canvas**:

```javascript
// ── Performance: reducir partículas en móvil/tablet ──────────────────────
const IS_LOW_PERF = window.innerWidth < 900 || navigator.hardwareConcurrency <= 2;
const PARTICLE_COUNT = IS_LOW_PERF ? 20 : 50;
const PARTICLE_DIST  = IS_LOW_PERF ? 80  : 120;

// ── Pausar animación cuando la tab no está visible ──
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (window._canvasRAF) cancelAnimationFrame(window._canvasRAF);
  } else {
    if (typeof animate === 'function') animate();
  }
});
```

**Busca la línea** donde se crea el array de partículas (algo como `const N = 50` o similar) y cámbiala:
```javascript
// Busca algo como:
const N = 50;
// O el número de partículas hardcodeado
// REEMPLAZA con:
const N = PARTICLE_COUNT;
```

**Busca la llamada a `requestAnimationFrame`** dentro de la función de animación y guarda la referencia:
```javascript
// Busca algo como:
requestAnimationFrame(animate);
// REEMPLAZA con:
window._canvasRAF = requestAnimationFrame(animate);
```

### 3C — Parallelizar fetches en `loadDashboard`

**Busca** la función `loadDashboard` en el JS.

Si tiene llamadas secuenciales como:
```javascript
const dataA = await api('/students');
const dataB = await api('/exams');
```

**REEMPLAZA con paralelo**:
```javascript
async function loadDashboard() {
  try {
    const [studentsData, examsData] = await Promise.all([
      api('/students'),
      api('/exams'),
    ]);
    // resto del código usando studentsData y examsData
  } catch (err) {
    console.error('[Dashboard]', err);
  }
}
```

---

## FIX 4 — TABLET RESPONSIVE (768px–900px)

**Archivo**: `fronted/app.html` — agregar dentro del bloque `@media(max-width:900px)` existente:

**REEMPLAZA** el bloque `@media(max-width:900px)` con:

```css
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .g2, .g3  { grid-template-columns: 1fr; }
  .g2e      { grid-template-columns: 1fr; }

  /* ── Tablet-específico (768–900px) ── */
  .app { grid-template-columns: 200px 1fr; } /* sidebar más angosto */
  .tab { padding: 20px 22px; }
  .nav-item { font-size: 12px; padding: 7px 9px; }
  .nav-item svg { width: 14px; height: 14px; }
  .logo-name { font-size: 15px; }
  .page-title { font-size: 20px; }
  .kpi { padding: 14px; }
  .kv  { font-size: 26px; }
  .card { padding: 16px; }
  .btn  { padding: 7px 12px; font-size: 12px; }
  table { font-size: 11.5px; }
  th { padding: 7px 9px; }
  td { padding: 8px 9px; }

  /* Tabla scroll en tablet */
  .card { overflow-x: auto; }
  table { min-width: 520px; }

  /* Chat en tablet */
  .ai-chat { height: calc(100vh - 160px); }
}
```

---

## FIX 5 — SISTEMA DE LOGS

### 5A — Crear `src/middleware/logger.js`

**Crea el archivo** `src/middleware/logger.js` con este contenido completo:

```javascript
/**
 * Logger Middleware — IntelliExam v3
 * Logs estructurados para debugging en Railway/producción
 * Logs van a: stdout (Railway los captura automáticamente)
 * Ver en: Railway dashboard → Deployments → tu deploy → Logs
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug | info | warn | error
const IS_DEV    = process.env.NODE_ENV !== 'production';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

function formatLog(level, category, message, meta = {}) {
  const ts   = new Date().toISOString();
  const icon = { debug: '🔍', info: '✅', warn: '⚠️', error: '❌' }[level] || '📋';

  if (IS_DEV) {
    // Formato legible en desarrollo
    const metaStr = Object.keys(meta).length
      ? '\n  ' + Object.entries(meta).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n  ')
      : '';
    return `${icon} [${ts}] [${level.toUpperCase()}] [${category}] ${message}${metaStr}`;
  }

  // Formato JSON para Railway/producción (fácil de parsear)
  return JSON.stringify({ ts, level, category, message, ...meta });
}

const logger = {
  debug: (cat, msg, meta) => shouldLog('debug') && console.log(formatLog('debug', cat, msg, meta)),
  info:  (cat, msg, meta) => shouldLog('info')  && console.log(formatLog('info',  cat, msg, meta)),
  warn:  (cat, msg, meta) => shouldLog('warn')  && console.warn(formatLog('warn',  cat, msg, meta)),
  error: (cat, msg, meta) => shouldLog('error') && console.error(formatLog('error', cat, msg, meta)),
};

// ── Request logger middleware ──────────────────────────────────────────────────
function requestLogger(req, res, next) {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  req.reqId   = reqId;

  // Log de entrada
  logger.info('HTTP', `→ ${req.method} ${req.path}`, {
    reqId,
    ip:     req.ip || req.connection?.remoteAddress,
    ua:     req.get('user-agent')?.slice(0, 80),
    userId: req.user?.id || 'unauthenticated',
  });

  // Intercept response finish
  const originalEnd  = res.end.bind(res);
  res.end = function(...args) {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level]('HTTP', `← ${req.method} ${req.path} ${res.statusCode} (${ms}ms)`, {
      reqId,
      status: res.statusCode,
      ms,
      userId: req.user?.id || 'unauthenticated',
    });
    return originalEnd(...args);
  };

  next();
}

// ── AI usage logger ────────────────────────────────────────────────────────────
function logAIUsage(teacherId, model, tokensIn, tokensOut, feature) {
  const cost = (tokensIn * 0.000003) + (tokensOut * 0.000015); // Claude Sonnet 3.5 pricing
  logger.info('AI', `Tokens usados: ${tokensIn + tokensOut}`, {
    teacherId,
    model,
    tokensIn,
    tokensOut,
    totalTokens:   tokensIn + tokensOut,
    costUSD:       cost.toFixed(6),
    feature,       // 'chat' | 'planeacion' | 'exam' | 'feedback'
  });
}

// ── Error logger ───────────────────────────────────────────────────────────────
function logError(category, error, meta = {}) {
  logger.error(category, error.message, {
    stack:   IS_DEV ? error.stack : error.stack?.split('\n')[1]?.trim(),
    name:    error.name,
    ...meta,
  });
}

// ── DB query logger (solo en debug) ───────────────────────────────────────────
function logDB(sql, args, ms) {
  if (!shouldLog('debug')) return;
  logger.debug('DB', sql.slice(0, 80), { args: args?.slice(0,3), ms });
}

module.exports = { logger, requestLogger, logAIUsage, logError, logDB };
```

---

### 5B — Registrar el logger en `server.js`

**Ubica** al inicio de `server.js` los imports existentes.

**Agrega esta línea** con los imports:
```javascript
const { requestLogger, logger } = require('./src/middleware/logger');
```

**Ubica** donde están los middlewares (`app.use(cors(...))`, `app.use(express.json())`).

**Agrega** el requestLogger DESPUÉS de cors y json:
```javascript
app.use(cors({ ... }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);  // ← AGREGAR ESTA LÍNEA
```

**Busca** donde se inicia el servidor (`app.listen`) y agrega log:
```javascript
app.listen(PORT, () => {
  logger.info('SERVER', `IntelliExam backend iniciado`, {
    port:    PORT,
    env:     process.env.NODE_ENV || 'development',
    turso:   process.env.TURSO_CONNECTION_URL ? 'conectado' : 'sin configurar',
    claude:  process.env.ANTHROPIC_API_KEY ? 'configurado' : 'sin configurar',
    version: '3.0.0',
  });
});
```

---

### 5C — Usar el logger en los servicios (reemplazar console.error)

**En `src/services/ai.service.js`**, agrega al inicio:
```javascript
const { logger, logAIUsage, logError } = require('../middleware/logger');
```

**Busca todos los** `console.error('[AI...]:` y reemplaza con:
```javascript
// Antes:
console.error('[AI Chat Error]:', err);
// Después:
logError('AI', err, { teacherId, feature: 'chat' });
```

**En `exports.chat`**, después de obtener la respuesta de Claude, agrega:
```javascript
logAIUsage(teacherId, CLAUDE_MODEL, inputTok, outputTok, 'chat');
```

**En `src/controllers/exams.controller.js`**, agrega al inicio:
```javascript
const { logError } = require('../middleware/logger');
```

**Reemplaza**:
```javascript
console.error('Error generando examen con IA:', e);
```
**Con**:
```javascript
logError('EXAM', e, { teacherId: req.user?.id, title, subject });
```

---

### 5D — Agregar variable de entorno en Railway

En Railway → Variables de entorno, agrega:
```
LOG_LEVEL=info
```

Para ver logs de debug temporalmente (solo en desarrollo):
```
LOG_LEVEL=debug
```

### Cómo ver los logs en Railway:
```
Railway Dashboard
  → Tu proyecto intelliexam-v3
  → Deployments
  → Click en el deploy más reciente
  → Pestaña "Logs"
  → Filtra por: [ERROR] para errores, [AI] para uso de IA, [HTTP] para requests
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### PDF:
```
[ ] Generar examen → aparece botón "↓ PDF" en la tabla
[ ] Click "↓ PDF" → se abre nueva ventana con examen formateado
[ ] El examen tiene: encabezado, datos del alumno, preguntas numeradas, opciones con círculo
[ ] Las opciones están en grid 2 columnas
[ ] Hay campo de calificación al final
[ ] Ctrl+P → "Guardar como PDF" produce PDF limpio
[ ] En móvil: botón funciona (si hay bloqueador de popups, mostrar instrucción)
```

### Word:
```
[ ] Click "↓ Word" → descarga archivo .docx real (no corrupto)
[ ] Abrir el .docx en Word/Google Docs → formato correcto
[ ] El .docx tiene preguntas numeradas, opciones con letra
[ ] Pie de página con nombre del docente
[ ] Márgenes correctos (no cortado)
```

### Performance:
```
[ ] En móvil: solo 20 partículas (no 50)
[ ] Cambiar de tab es instantáneo (< 100ms)
[ ] El canvas se pausa cuando la app está en background
[ ] loadDashboard hace 2 fetches en paralelo
```

### Tablet:
```
[ ] En iPad (768px): sidebar visible pero angosto (200px)
[ ] Texto y botones legibles sin zoom
[ ] Tablas con scroll horizontal
[ ] Chat funciona correctamente
```

### Logs:
```
[ ] npm run dev → ver en terminal: "✅ [INFO] [SERVER] IntelliExam backend iniciado"
[ ] Hacer login → ver en terminal: "✅ [INFO] [HTTP] → POST /api/auth/login"
[ ] Response → ver: "✅ [INFO] [HTTP] ← POST /api/auth/login 200 (45ms)"
[ ] Error intencional → ver: "❌ [ERROR] ..."
[ ] En Railway Logs → mismos logs con formato JSON
```

---

## 📋 ORDEN DE EJECUCIÓN PARA ANTIGRAVITY

```
1. npm install docx                    (en carpeta backend/)
2. Crear src/middleware/logger.js      (contenido completo arriba)
3. Modificar server.js                 (agregar requestLogger)
4. Modificar src/services/pdf.service.js (agregar generateExamHTML)
5. Modificar src/routes/exams.routes.js  (agregar /pdf y /docx)
6. Modificar src/services/ai.service.js  (agregar logAIUsage)
7. Modificar src/controllers/exams.controller.js (logError)
8. Modificar fronted/app.html          (funciones downloadExamPDF + downloadExamDOCX + CSS performance + tablet)
9. npm run dev → verificar que arranca
10. Probar PDF → probar Word → verificar logs
11. git add -A && git commit -m "fix: PDF/Word/Performance/Tablet/Logs" && git push
```

---

*Auditoría: Claude Senior — Zyntra Intelligence | Mayo 2026*
