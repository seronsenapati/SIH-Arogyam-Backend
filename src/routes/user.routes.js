const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getMe, updateMe, upload } = require('../controllers/user.controller');

router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('photo'), updateMe);

module.exports = router;