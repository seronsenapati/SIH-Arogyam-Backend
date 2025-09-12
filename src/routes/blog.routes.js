const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { validateBlog } = require('../middleware/validation.middleware');
const { getAll, create } = require('../controllers/blog.controller');

router.get('/', getAll);
router.post('/', protect, restrictTo('admin', 'doctor', 'consultant'), validateBlog, create);

module.exports = router;