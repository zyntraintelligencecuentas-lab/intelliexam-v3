const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/exams.controller');

router.use(requireAuth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.delete('/:id', ctrl.remove);

// Descargar examen como PDF profesional (PDFKit)
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { turso } = require('../config/turso');
    const pdfService = require('../services/pdf.service');

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

    const safeTitle = (exam.title || 'examen').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);

    pdfService.generateExamPDF(exam, teacher, res);
  } catch (err) { next(err); }
});

// Descargar examen como Word (.docx)
router.get('/:id/docx', async (req, res, next) => {
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
          new TextRun({ text: 'IntelliExam · Generado por Sophia IA · ', size: 16, color: '94a3b8' }),
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
      description: `Examen generado por Sophia IA — ${exam.subject}`,
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


module.exports = router;
