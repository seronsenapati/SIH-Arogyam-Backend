const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { submitRating } = require('../controllers/rating.controller');

router.post('/:id/rate', protect, submitRating);

module.exports = router;