const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getAll, markAsRead } = require('../controllers/notification.controller');

router.get('/', authenticate, getAll);
router.put('/:id/read', authenticate, markAsRead);

module.exports = router;