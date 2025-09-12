const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const { create, getAll } = require('../controllers/prescription.controller');

router.post('/:id/prescriptions', authenticate, authorizeRoles('doctor'), create);
router.get('/:id/prescriptions', authenticate, getAll);

module.exports = router;