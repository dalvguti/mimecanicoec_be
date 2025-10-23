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
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

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

