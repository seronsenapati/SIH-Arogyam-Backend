const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getAll, markAsRead } = require('../controllers/notification.controller');

router.get('/', protect, getAll);
router.put('/:id/read', protect, markAsRead);

module.exports = router;