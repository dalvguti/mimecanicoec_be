const express = require('express');
const router = express.Router();
const {
  getWorkOrders,
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder
} = require('../controllers/workOrdersController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getWorkOrders)
  .post(authorize('admin', 'receptionist'), createWorkOrder);

router
  .route('/:id')
  .get(getWorkOrder)
  .put(authorize('admin', 'receptionist', 'mechanic'), updateWorkOrder)
  .delete(authorize('admin'), deleteWorkOrder);

module.exports = router;

