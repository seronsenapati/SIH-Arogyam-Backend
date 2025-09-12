const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getConsultants,
  getConsultant,
  getAvailability,
  createAvailability
} = require('../controllers/consultant.controller');

router.get('/', getConsultants);
router.get('/:id', getConsultant);
router.get('/:id/availability', getAvailability);
router.post('/:id/availability', authenticate, authorizeRoles('consultant', 'admin'), createAvailability);

module.exports = router;