/**
 * PDF Service — IntelliExam v3
 * Genera PDFs profesionales para reportes y planeaciones docentes
 * Usa generación HTML-to-PDF via respuesta de texto enriquecido
 */

const { turso } = require('../config/turso');

// ── Estilos base para todos los PDFs ──────────────────────────────────────────
const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Lora:ital,wght@0,400..700;1,400..700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: letter; margin: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #ffffff;
    color: #1e293b;
    font-size: 11pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
  }
  .page { 
    padding: 2.5cm 2.5cm; 
    max-width: 21.59cm; 
    margin: 0 auto; 
    background: white;
    position: relative;
    min-height: 27.94cm;
  }
  .cover {
    height: 27.94cm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    padding: 3cm;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: ''; position: absolute; top: -10%; right: -10%; width: 40%; height: 40%;
    background: radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%);
  }
  .cover-badge {
    display: inline-block;
    background: rgba(0,240,255,0.1);
    border: 1px solid rgba(0,240,255,0.3);
    color: #22d3ee;
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 6px;
    margin-bottom: 32px;
  }
  .cover h1 {
    font-family: 'Lora', serif;
    font-size: 42pt;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 20px;
    color: #f8fafc;
  }
  .cover-sub { font-size: 18pt; color: #94a3b8; margin-bottom: 60px; font-weight: 300; }
  .cover-meta { 
    font-size: 11pt; 
    color: #cbd5e1; 
    border-left: 2px solid #00f0ff;
    padding-left: 24px;
    margin-top: 40px;
  }
  .cover-meta div { margin-bottom: 8px; }
  .cover-meta strong { color: #f8fafc; font-weight: 600; }
  
  h2 { font-family: 'Lora', serif; font-size: 20pt; font-weight: 700; color: #0f172a; margin: 40px 0 20px; border-bottom: 3px solid #00f0ff; padding-bottom: 10px; page-break-after: avoid; }
  h3 { font-size: 15pt; font-weight: 700; color: #1e293b; margin: 30px 0 15px; background: #f1f5f9; padding: 8px 15px; border-radius: 6px; page-break-after: avoid; }
  h4 { font-size: 12pt; font-weight: 700; color: #334155; margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  
  p { margin-bottom: 12pt; color: #334155; text-align: justify; }
  ul, ol { margin: 15pt 0 15pt 30pt; color: #334155; }
  li { margin-bottom: 8pt; }
  
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 35px; }
  .info-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 18px; }
  .info-label { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
  .info-value { font-size: 13pt; font-weight: 600; color: #0f172a; }
  
  .moment-block { background: #ffffff; border: 1px solid #e2e8f0; border-left-width: 6px; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .moment-label { font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .momento-inicio { border-left-color: #10b981; } .momento-inicio .moment-label { color: #059669; }
  .momento-desarrollo { border-left-color: #0ea5e9; } .momento-desarrollo .moment-label { color: #0284c7; }
  .momento-cierre { border-left-color: #8b5cf6; } .momento-cierre .moment-label { color: #7c3aed; }
  
  .evaluacion-table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 10.5pt; border: 1px solid #e2e8f0; }
  .evaluacion-table th { background: #1e293b; color: white; padding: 12px 15px; text-align: left; font-size: 9pt; font-weight: 600; text-transform: uppercase; }
  .evaluacion-table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; color: #475569; }
  .evaluacion-table tr:nth-child(even) td { background: #f8fafc; }
  
  .footer { 
    position: absolute; bottom: 1cm; left: 2.5cm; right: 2.5cm;
    padding-top: 15px; border-top: 1px solid #e2e8f0; 
    display: flex; justify-content: space-between; 
    font-size: 8.5pt; color: #94a3b8; font-weight: 500;
  }
  .watermark { position: fixed; bottom: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; color: rgba(0,0,0,0.02); pointer-events: none; z-index: -1; font-weight: 900; }
  strong { color: #0f172a; font-weight: 700; }
  @media print {
    body { background: white; }
    .page { box-shadow: none; margin: 0; padding: 2cm; }
    .cover { height: 100vh; }
  }
`;

// ── Generar HTML de planeación ─────────────────────────────────────────────────
exports.generatePlaneacionHTML = (data) => {
  const { content, materia, tema, grado, teacher } = data;
  const date  = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const year  = new Date().getFullYear();

  // Convertir markdown simple a HTML
  const formatContent = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^# (.*$)/gm, '<h2>$1</h2>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '<p>')
      .replace(/(?<![>])$/gm, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/INICIO.*?(\(.*?min.*?\))/gi, '<div class="moment-block momento-inicio"><div class="moment-label">⬤ Inicio $1</div>')
      .replace(/DESARROLLO.*?(\(.*?min.*?\))/gi, '<div class="moment-block momento-desarrollo"><div class="moment-label">⬤ Desarrollo $1</div>')
      .replace(/CIERRE.*?(\(.*?min.*?\))/gi, '<div class="moment-block momento-cierre"><div class="moment-label">⬤ Cierre $1</div>');
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Planeación — ${materia} — ${tema}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  <!-- PORTADA -->
  <div class="cover">
    <div class="cover-badge">IntelliExam · Planeación Docente</div>
    <h1>${materia}</h1>
    <div class="cover-sub">${tema}</div>
    <div class="cover-line"></div>
    <div class="cover-meta">
      <div><strong>Grado:</strong> ${grado}</div>
      <div><strong>Docente:</strong> ${teacher?.full_name || 'Docente IntelliExam'}</div>
      <div><strong>Escuela:</strong> ${teacher?.school || '—'}</div>
      <div style="margin-top:12px"><strong>Generado:</strong> ${date}</div>
      <div style="margin-top:4px; font-size:8pt; color:rgba(255,255,255,0.3)">Alineado al Plan NEM 2022 · SEP · Ameyalli IA</div>
    </div>
  </div>

  <!-- CONTENIDO DE LA PLANEACIÓN -->
  <div class="page">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">Materia</div>
        <div class="info-value">${materia}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Grado</div>
        <div class="info-value">${grado}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Ciclo Escolar</div>
        <div class="info-value">${year}–${year + 1}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Enfoque</div>
        <div class="info-value">NEM 2022</div>
      </div>
    </div>

    <div class="section">
      ${formatContent(content)}
    </div>

    <div class="footer">
      <span>IntelliExam v3 · Planeación generada con Ameyalli IA</span>
      <span>${date}</span>
    </div>
  </div>
</body>
</html>`;
};

// ── Generar HTML de reporte grupal ─────────────────────────────────────────────
exports.generateGroupReportHTML = (data) => {
  const { students, teacher, groupName } = data;
  const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const avgs    = students.filter(s => s.avg !== null).map(s => parseFloat(s.avg));
  const groupAvg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '—';
  const atRisk  = students.filter(s => (s.avg || 0) < 60).length;
  const topStudents = [...students].sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 5);

  const rows = students.map(s => {
    const avg   = s.avg !== null ? `${s.avg}%` : '—';
    const status = (s.avg || 0) >= 80 ? '✅ Bien' : (s.avg || 0) >= 60 ? '⚠️ Vigilar' : '🔴 Riesgo';
    return `<tr>
      <td>${s.list_number || '—'}</td>
      <td><strong>${s.name}</strong></td>
      <td>${avg}</td>
      <td>${s.exams_count || 0}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Grupal — ${groupName}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">IntelliExam · Reporte Grupal</div>
    <h1>Reporte de Grupo</h1>
    <div class="cover-sub">${groupName || teacher?.group_name || 'Grupo'} · ${teacher?.grade || ''}</div>
    <div class="cover-line"></div>
    <div class="cover-meta">
      <div><strong>Docente:</strong> ${teacher?.full_name || 'Docente'}</div>
      <div><strong>Escuela:</strong> ${teacher?.school || '—'}</div>
      <div style="margin-top:12px"><strong>Generado:</strong> ${date}</div>
    </div>
  </div>

  <div class="page">
    <div class="info-grid">
      <div class="info-card"><div class="info-label">Total Alumnos</div><div class="info-value">${students.length}</div></div>
      <div class="info-card"><div class="info-label">Promedio Grupal</div><div class="info-value" style="color:#059669">${groupAvg}%</div></div>
      <div class="info-card"><div class="info-label">Alumnos en Riesgo</div><div class="info-value" style="color:#dc2626">${atRisk}</div></div>
      <div class="info-card"><div class="info-label">Alumnos con ≥80%</div><div class="info-value" style="color:#0891b2">${students.filter(s => (s.avg || 0) >= 80).length}</div></div>
    </div>

    <h2>Lista completa de alumnos</h2>
    <table class="evaluacion-table">
      <thead><tr><th>#</th><th>Nombre</th><th>Promedio</th><th>Exámenes</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="footer">
      <span>IntelliExam v3 · Reporte generado con Ameyalli IA</span>
      <span>${date}</span>
    </div>
  </div>
</body>
</html>`;
};

// ── Datos para reporte de estudiante ──────────────────────────────────────────
exports.generateStudentReport = async (studentId, teacherId) => {
  const studentResult = await turso.execute({
    sql: `SELECT * FROM students WHERE id = ? AND teacher_id = ?`,
    args: [studentId, teacherId],
  });

  if (!studentResult.rows.length) throw new Error('Estudiante no encontrado');

  const examsResult = await turso.execute({
    sql: `SELECT * FROM exam_results WHERE student_id = ? ORDER BY created_at DESC`,
    args: [studentId],
  });

  return {
    type: 'student_report',
    student: studentResult.rows[0],
    exams: examsResult.rows || [],
    generatedAt: new Date().toISOString(),
  };
};

// ── Datos para reporte grupal ──────────────────────────────────────────────────
exports.generateGroupReport = async (teacherId, groupName) => {
  const result = await turso.execute({
    sql: `SELECT * FROM students WHERE teacher_id = ? AND status != 'deleted' ORDER BY list_number ASC`,
    args: [teacherId],
  });
  return { type: 'group_report', groupName, students: result.rows || [], generatedAt: new Date().toISOString() };
};

// ── Datos para reporte ejecutivo ───────────────────────────────────────────────
exports.generateExecutiveReport = async (teacherId) => {
  const [s, e] = await Promise.all([
    turso.execute({ sql: `SELECT COUNT(*) as total FROM students WHERE teacher_id = ?`, args: [teacherId] }),
    turso.execute({ sql: `SELECT COUNT(*) as total FROM exams WHERE teacher_id = ?`, args: [teacherId] }),
  ]);
  return {
    type: 'executive_report',
    summary: { totalStudents: s.rows[0]?.total || 0, totalExams: e.rows[0]?.total || 0 },
    generatedAt: new Date().toISOString(),
  };
};

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

// ── Exportar CSV ───────────────────────────────────────────────────────────────
exports.exportGradesCSV = async (examId) => {
  const results = await turso.execute({
    sql: `SELECT s.name, s.list_number, er.score, er.correct, er.incorrect
          FROM exam_results er
          JOIN students s ON er.student_id = s.id
          WHERE er.exam_id = ?
          ORDER BY s.list_number`,
    args: [examId],
  });

  let csv = 'Número,Nombre,Calificación,Correctas,Incorrectas\n';
  for (const row of results.rows || []) {
    csv += `${row.list_number},"${row.name}",${row.score},${row.correct},${row.incorrect}\n`;
  }
  return csv;
};

