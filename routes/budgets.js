const express = require('express');
const router = express.Router();
const {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget
} = require('../controllers/budgetsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getBudgets)
  .post(authorize('admin', 'receptionist'), createBudget);

router
  .route('/:id')
  .get(getBudget)
  .put(authorize('admin', 'receptionist'), updateBudget)
  .delete(authorize('admin'), deleteBudget);

module.exports = router;

