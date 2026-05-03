const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { turso }       = require('../config/turso');

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    // Ejecutar queries en paralelo
    const [studentsRes, examsRes, profileRes] = await Promise.all([
      turso.execute({
        sql: `SELECT s.*, 
                ROUND(AVG(er.score), 1) as avg,
                COUNT(er.id) as exams_count,
                (SELECT er2.score FROM exam_results er2 
                 WHERE er2.student_id = s.id 
                 ORDER BY er2.created_at DESC LIMIT 1) as last_score,
                (SELECT er3.score FROM exam_results er3 
                 WHERE er3.student_id = s.id 
                 ORDER BY er3.created_at DESC LIMIT 1 OFFSET 1) as prev_score
              FROM students s
              LEFT JOIN exam_results er ON s.id = er.student_id
              WHERE s.teacher_id = ? AND s.status != 'deleted'
              GROUP BY s.id
              ORDER BY s.list_number ASC`,
        args: [teacherId],
      }),
      turso.execute({
        sql: `SELECT e.*,
                ROUND(AVG(er.score), 1) as avg_score,
                COUNT(er.id) as results_count
              FROM exams e
              LEFT JOIN exam_results er ON e.id = er.exam_id
              WHERE e.teacher_id = ?
              GROUP BY e.id
              ORDER BY e.created_at DESC
              LIMIT 20`,
        args: [teacherId],
      }),
      turso.execute({
        sql: `SELECT full_name, school, grade, group_name, plan FROM profiles WHERE id = ?`,
        args: [teacherId],
      }),
    ]);

    const students = studentsRes.rows || [];
    const exams    = examsRes.rows || [];
    const profile  = profileRes.rows[0] || {};

    // Calcular KPIs
    const allAvgs    = students.filter(s => s.avg !== null).map(s => parseFloat(s.avg));
    const groupAvg   = allAvgs.length
      ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(1)
      : 0;
    const atRisk     = students.filter(s => (s.avg || 0) < 60).length;
    const watching   = students.filter(s => (s.avg || 0) >= 60 && (s.avg || 0) < 70).length;

    // Tema crítico: materia del examen más reciente con avg más bajo
    const criticalExam = [...exams]
      .filter(e => e.avg_score !== null)
      .sort((a, b) => (a.avg_score || 100) - (b.avg_score || 100))[0];

    res.json({
      profile,
      students: students.map(s => ({
        ...s,
        trend: s.last_score !== null && s.prev_score !== null
          ? (parseFloat(s.last_score) - parseFloat(s.prev_score)).toFixed(1)
          : '0',
        status: (s.avg || 0) >= 70 ? 'ok' : (s.avg || 0) >= 60 ? 'watch' : 'risk',
      })),
      exams,
      stats: {
        total_students: students.length,
        total_exams:    exams.length,
        group_avg:      parseFloat(groupAvg),
        at_risk:        atRisk,
        watching,
        top_student:    students.sort((a, b) => (b.avg || 0) - (a.avg || 0))[0] || null,
        critical_subject: criticalExam ? {
          subject:  criticalExam.subject,
          avg:      criticalExam.avg_score,
          exam_id:  criticalExam.id,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
