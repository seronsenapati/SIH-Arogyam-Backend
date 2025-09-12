const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { getToken, completeSession } = require('../controllers/session.controller');

router.post('/:appointmentId/token', protect, getToken);
router.post('/:appointmentId/complete', protect, restrictTo('consultant'), completeSession);

module.exports = router;