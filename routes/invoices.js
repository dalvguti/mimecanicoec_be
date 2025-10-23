const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoice,
  createInvoice,
  createInvoiceFromWorkOrder,
  updateInvoice,
  addPayment,
  deleteInvoice
} = require('../controllers/invoicesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/from-work-order/:workOrderId', authorize('admin', 'receptionist'), createInvoiceFromWorkOrder);

router
  .route('/')
  .get(getInvoices)
  .post(authorize('admin', 'receptionist'), createInvoice);

router
  .route('/:id')
  .get(getInvoice)
  .put(authorize('admin', 'receptionist'), updateInvoice)
  .delete(authorize('admin'), deleteInvoice);

router.post('/:id/payments', authorize('admin', 'receptionist'), addPayment);

module.exports = router;

