const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { validatePrescription } = require('../middleware/validation.middleware');
const { create, getAll } = require('../controllers/prescription.controller');

router.post('/:id/prescriptions', protect, restrictTo('doctor'), validatePrescription, create);
router.get('/:id/prescriptions', protect, getAll);

module.exports = router;