const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { submitRating } = require('../controllers/rating.controller');

router.post('/:id/rate', authenticate, submitRating);

module.exports = router;