const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo JPG, PNG o PDF permitidos'));
  },
});

const scanController = require('../controllers/scan.controller');

router.post('/process', requireAuth, upload.single('file'), scanController.processExam);

module.exports = router;
