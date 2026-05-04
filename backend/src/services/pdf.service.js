const PDFDocument = require('pdfkit');

/**
 * GENERATE EXAM PDF - Generar un PDF académico profesional
 */
exports.generateExamPDF = (exam, teacher, stream) => {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  doc.pipe(stream);

  // --- ENCABEZADO ---
  doc.fontSize(16).font('Helvetica-Bold').text('INTELLIEXAM V4.0', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('SISTEMA DE EVALUACIÓN DIGITAL', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(14).font('Helvetica-Bold').text(exam.title.toUpperCase(), { align: 'center' });
  doc.fontSize(10).font('Helvetica-Oblique').text('Ciclo Escolar 2025-2026', { align: 'center' });
  doc.moveDown(1.5);

  // --- CUADRO DE DATOS ---
  const startY = doc.y;
  doc.rect(50, startY, 512, 60).stroke();
  
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('ALUMNO:', 60, startY + 10);
  doc.font('Helvetica').text('__________________________________________________________', 110, startY + 10);
  
  doc.font('Helvetica-Bold').text('FECHA:', 430, startY + 10);
  doc.font('Helvetica').text('___________', 475, startY + 10);

  doc.font('Helvetica-Bold').text('DOCENTE:', 60, startY + 35);
  doc.font('Helvetica').text(teacher.full_name || '_________________________', 115, startY + 35);

  doc.font('Helvetica-Bold').text('GRADO:', 300, startY + 35);
  doc.font('Helvetica').text(teacher.grade || '___', 345, startY + 35);

  doc.font('Helvetica-Bold').text('CALIF:', 430, startY + 35);
  doc.font('Helvetica').text('___________', 475, startY + 35);

  doc.moveDown(4);

  // --- INSTRUCCIONES ---
  doc.fillColor('#f2f2f2').rect(50, doc.y, 512, 20).fill().fillColor('#000');
  doc.fontSize(9).font('Helvetica-Bold').text('INSTRUCCIONES:', 60, doc.y - 15);
  doc.font('Helvetica').text('Lee con atención y responde de manera clara cada reactivo.', 150, doc.y - 15);
  doc.moveDown(2);

  // --- CONTENIDO (PREGUNTAS) ---
  const content = exam.content || '';
  const lines = content.split('\n');

  lines.forEach(line => {
    if (line.startsWith('###') || line.startsWith('APARTADO')) {
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text(line.replace('###', '').trim());
      doc.fillColor('#000');
    } else if (/^\d+\./.test(line)) {
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold').text(line.trim());
    } else if (/^[a-d]\)/.test(line)) {
      doc.fontSize(10).font('Helvetica').text('      ' + line.trim());
    } else if (line.trim().length > 0) {
      doc.fontSize(10).font('Helvetica').text(line.trim());
    }
  });

  // --- PIE DE PÁGINA ---
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('grey').text(
      `Página ${i + 1} de ${range.count} | Generado por IntelliExam v4.0`,
      50, 750, { align: 'center' }
    );
  }

  doc.end();
};

/**
 * GENERATE PLANNING PDF - Generar Planeación Didáctica
 */
exports.generatePlaneacionPDF = (plan, teacher, stream) => {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  doc.pipe(stream);

  doc.fontSize(16).font('Helvetica-Bold').text('PLANEACIÓN DIDÁCTICA NEM 2022', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('SISTEMA DE GESTIÓN PEDAGÓGICA', { align: 'center' });
  doc.moveDown(1.5);

  doc.rect(50, doc.y, 512, 40).stroke();
  doc.fontSize(9).font('Helvetica-Bold').text(`CAMPO/MATERIA: ${plan.materia}`, 60, doc.y + 10);
  doc.text(`GRADO: ${plan.grado}`, 350, doc.y - 0);
  doc.text(`TEMA: ${plan.tema}`, 60, doc.y + 10);

  doc.moveDown(3);
  doc.fontSize(10).font('Helvetica').text(plan.content, { align: 'justify' });

  doc.end();
};
