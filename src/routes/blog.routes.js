const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const { getAll, create } = require('../controllers/blog.controller');

router.get('/', getAll);
router.post('/', authenticate, authorizeRoles('admin', 'doctor'), create);

module.exports = router;