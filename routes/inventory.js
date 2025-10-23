const express = require('express');
const router = express.Router();
const {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getCategories,
  getServices,
  createService
} = require('../controllers/inventoryController');
const { authorize } = require('../middleware/auth');

// All routes are protected (middleware applied at server level)

router.get('/categories', getCategories);
router.get('/services', getServices);
router.post('/services', authorize('admin'), createService);

router
  .route('/')
  .get(getInventoryItems)
  .post(authorize('admin', 'receptionist'), createInventoryItem);

router
  .route('/:id')
  .get(getInventoryItem)
  .put(authorize('admin', 'receptionist'), updateInventoryItem)
  .delete(authorize('admin'), deleteInventoryItem);

module.exports = router;

