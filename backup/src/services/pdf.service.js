/**
 * PDF Service — IntelliExam v3
 * Genera PDFs profesionales para reportes y planeaciones docentes
 * Usa generación HTML-to-PDF via respuesta de texto enriquecido
 */

const { turso } = require('../config/turso');

// ── Estilos base para todos los PDFs ──────────────────────────────────────────
const PDF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    color: #1a1a2e;
    font-size: 11pt;
    line-height: 1.6;
  }
  .page { padding: 40px 50px; max-width: 800px; margin: 0 auto; }
  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: linear-gradient(135deg, #03050a 0%, #0a1628 100%);
    color: white;
    padding: 60px;
    page-break-after: always;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(0,240,255,0.15);
    border: 1px solid rgba(0,240,255,0.4);
    color: #00f0ff;
    font-size: 9pt;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 4px;
    margin-bottom: 24px;
  }
  .cover h1 {
    font-size: 36pt;
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.1;
    margin-bottom: 16px;
    color: #ffffff;
  }
  .cover-sub { font-size: 14pt; color: rgba(255,255,255,0.6); margin-bottom: 40px; }
  .cover-meta { font-size: 10pt; color: rgba(255,255,255,0.4); }
  .cover-meta strong { color: rgba(255,255,255,0.75); }
  .cover-line { width: 60px; height: 3px; background: #00f0ff; margin: 24px 0; border-radius: 2px; }
  h2 { font-size: 16pt; font-weight: 700; color: #0a1628; margin: 28px 0 14px; border-bottom: 2px solid #00f0ff; padding-bottom: 8px; }
  h3 { font-size: 13pt; font-weight: 600; color: #1a1a2e; margin: 20px 0 10px; }
  h4 { font-size: 11pt; font-weight: 600; color: #2d3748; margin: 16px 0 8px; }
  p { margin-bottom: 10px; color: #374151; }
  ul, ol { margin: 10px 0 10px 24px; color: #374151; }
  li { margin-bottom: 5px; }
  .section { margin-bottom: 32px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
  .info-label { font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  .info-value { font-size: 12pt; font-weight: 600; color: #1a1a2e; }
  .moment-block { background: #fafafa; border-left: 3px solid #00f0ff; padding: 16px 20px; margin-bottom: 16px; border-radius: 0 8px 8px 0; }
  .moment-label { font-size: 9pt; letter-spacing: 0.1em; text-transform: uppercase; color: #00b8cc; font-weight: 600; margin-bottom: 8px; }
  .momento-inicio { border-color: #10ffaa; } .momento-inicio .moment-label { color: #059669; }
  .momento-desarrollo { border-color: #00f0ff; }
  .momento-cierre { border-color: #7c3aed; } .momento-cierre .moment-label { color: #7c3aed; }
  .evaluacion-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
  .evaluacion-table th { background: #0a1628; color: white; padding: 10px 14px; text-align: left; font-size: 9pt; letter-spacing: 0.05em; }
  .evaluacion-table td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; color: #374151; }
  .evaluacion-table tr:nth-child(even) td { background: #f8fafc; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; margin: 2px; }
  .tag-cyan { background: rgba(0,240,255,0.1); color: #0891b2; border: 1px solid rgba(0,240,255,0.3); }
  .tag-green { background: rgba(16,255,170,0.1); color: #059669; border: 1px solid rgba(16,255,170,0.3); }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9pt; color: #94a3b8; }
  strong { color: #1a1a2e; }
  .highlight { background: rgba(0,240,255,0.08); border-radius: 4px; padding: 2px 6px; }
  @media print { .page { padding: 20px 30px; } }
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
