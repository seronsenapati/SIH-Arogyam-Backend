const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  getConsultants,
  getConsultant,
  getAvailability,
  createAvailability
} = require('../controllers/consultant.controller');

router.get('/', protect, getConsultants);
router.get('/:id', protect, getConsultant);
router.get('/:id/availability', protect, getAvailability);
router.post('/:id/availability', protect, restrictTo('consultant', 'admin'), createAvailability);

module.exports = router;