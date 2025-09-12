const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getStatus } = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/status', protect, getStatus);

module.exports = router;