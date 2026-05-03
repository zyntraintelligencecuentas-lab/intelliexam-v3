const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl    = require('../controllers/students.controller');

router.use(requireAuth);

router.get('/',          ctrl.list);
router.post('/',         ctrl.create);
router.post('/import',   ctrl.importCSV);
router.get('/:id',       ctrl.getOne);
router.put('/:id',       ctrl.update);
router.delete('/:id',    ctrl.remove);
router.get('/:id/stats', ctrl.getStats);

module.exports = router;
