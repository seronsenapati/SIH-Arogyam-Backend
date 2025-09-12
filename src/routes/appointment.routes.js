const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { validateAppointment } = require('../middleware/validation.middleware');
const {
  create,
  getAll,
  getById,
  cancel,
  confirm
} = require('../controllers/appointment.controller');

router.post('/', protect, restrictTo('patient'), validateAppointment, create);
router.get('/', protect, getAll);
router.get('/:id', protect, getById);
router.put('/:id/cancel', protect, cancel);
router.put('/:id/confirm', protect, restrictTo('consultant'), confirm);

module.exports = router;