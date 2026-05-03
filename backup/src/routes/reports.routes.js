const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl    = require('../controllers/reports.controller');

router.use(requireAuth);

router.get('/',                  ctrl.list);
router.post('/generate',         ctrl.generate);
router.post('/pdf/planeacion',   ctrl.generatePlaneacionPDF);
router.post('/pdf/group',        ctrl.generateGroupPDF);
router.get('/student/:id',       ctrl.getStudentReport);

module.exports = router;
