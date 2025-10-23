const express = require('express');
const router = express.Router();
const {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget
} = require('../controllers/budgetsController');
const { authorize } = require('../middleware/auth');

// All routes are protected (middleware applied at server level)

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

