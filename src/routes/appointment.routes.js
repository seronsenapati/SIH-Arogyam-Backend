const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const {
  create,
  getAll,
  getById,
  cancel,
  confirm
} = require('../controllers/appointment.controller');

router.post('/', authenticate, authorizeRoles('patient'), create);
router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getById);
router.put('/:id/cancel', authenticate, cancel);
router.put('/:id/confirm', authenticate, authorizeRoles('consultant'), confirm);

module.exports = router;