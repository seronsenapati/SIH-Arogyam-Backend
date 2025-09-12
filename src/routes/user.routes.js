const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getMe, updateMe, upload } = require('../controllers/user.controller');

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, upload.single('photo'), updateMe);

module.exports = router;