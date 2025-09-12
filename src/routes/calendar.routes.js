const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getEvents } = require('../controllers/calendar.controller');

router.get('/:userId/events', protect, getEvents);

module.exports = router;