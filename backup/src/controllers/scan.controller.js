const { turso } = require('../config/turso');
const ocrService = require('../services/ocr.service');
const crypto = require('crypto');
const fs = require('fs');

exports.processExam = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { subject, group_name, total_items, answer_key } = req.body;

    // Procesar OCR
    const ocrResult = await ocrService.processExamImage(req.file.path);

    const examId = crypto.randomUUID();

    await turso.execute({
      sql: `INSERT INTO exams (id, teacher_id, subject, group_name, total_items, ocr_raw, status) VALUES (?, ?, ?, ?, ?, ?, 'processed')`,
      args: [examId, req.user.id, subject || 'Sin asignar', group_name || 'Sin grupo', total_items || 20, ocrResult.raw_text],
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      exam_id: examId,
      ocr: ocrResult,
      message: 'Examen procesado exitosamente',
    });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path).catch(() => {});
    next(err);
  }
};
