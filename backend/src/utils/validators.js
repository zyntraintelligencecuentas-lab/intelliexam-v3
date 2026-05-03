const { body, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Errores de validación',
      details: errors.array()
    });
  }
  next();
};

// Validadores para autenticación
exports.registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe incluir mayúsculas, minúsculas y números'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('school')
    .optional()
    .trim()
    .isLength({ max: 200 })
];

exports.loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// Validadores para estudiantes
exports.createStudentValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del alumno es requerido')
    .isLength({ min: 3, max: 150 })
    .withMessage('El nombre debe tener entre 3 y 150 caracteres'),
  body('list_number')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('El número de lista debe ser entre 1 y 999'),
  body('curp')
    .optional()
    .matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/)
    .withMessage('CURP inválido')
];

exports.updateStudentValidator = [
  param('id')
    .isUUID()
    .withMessage('ID de estudiante inválido'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 }),
  body('list_number')
    .optional()
    .isInt({ min: 1, max: 999 }),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'graduated'])
    .withMessage('Estado inválido')
];

// Validadores para exámenes
exports.createExamValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título del examen es requerido')
    .isLength({ min: 3, max: 200 }),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('La materia es requerida')
    .isLength({ min: 2, max: 100 }),
  body('total_items')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('El total de ítems debe ser entre 1 y 200')
];

// Validador para mensajes de IA
exports.aiChatValidator = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('El mensaje no puede estar vacío')
    .isLength({ max: 2000 })
    .withMessage('El mensaje no puede exceder 2000 caracteres')
];

// Validador genérico de UUID
exports.uuidValidator = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} inválido`)
];
