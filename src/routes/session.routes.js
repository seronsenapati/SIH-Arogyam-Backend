const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const { getToken, completeSession } = require('../controllers/session.controller');

router.post('/:appointmentId/token', authenticate, getToken);
router.post('/:appointmentId/complete', authenticate, authorizeRoles('consultant'), completeSession);

module.exports = router;