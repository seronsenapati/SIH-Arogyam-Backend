const { body, validationResult } = require('express-validator');

// Validation middleware for registration
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['patient', 'doctor']).withMessage('Role must be either patient or doctor'),
  body('doctorLicense').if((value, { req }) => req.body.role === 'doctor').notEmpty().withMessage('Doctor license is required for doctors'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

// Validation middleware for login
const validateLogin = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

// Validation middleware for appointment creation
const validateAppointment = [
  body('consultantId').notEmpty().withMessage('Consultant ID is required'),
  body('startAt').isISO8601().withMessage('Valid start date is required'),
  body('endAt').isISO8601().withMessage('Valid end date is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

// Validation middleware for prescription creation
const validatePrescription = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('medicines').isArray().withMessage('Medicines must be an array'),
  body('advice').optional().isString().withMessage('Advice must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

// Validation middleware for blog creation
const validateBlog = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }
    next();
  }
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateAppointment,
  validatePrescription,
  validateBlog
};