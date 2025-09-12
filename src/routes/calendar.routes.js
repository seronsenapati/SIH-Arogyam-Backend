const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getEvents } = require('../controllers/calendar.controller');

router.get('/:userId/events', authenticate, getEvents);

module.exports = router;