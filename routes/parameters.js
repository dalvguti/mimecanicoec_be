const express = require('express');
const router = express.Router();
const {
  getParameters,
  getParameter,
  updateParameter,
  createParameter,
  deleteParameter,
  getParametersByCategory
} = require('../controllers/parametersController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Public routes (all authenticated users can read)
router.get('/', getParameters);
router.get('/category/:category', getParametersByCategory);
router.get('/:key', getParameter);

// Admin only routes
router.post('/', authorize('admin'), createParameter);
router.put('/:key', authorize('admin'), updateParameter);
router.delete('/:key', authorize('admin'), deleteParameter);

module.exports = router;

