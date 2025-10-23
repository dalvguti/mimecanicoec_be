const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehiclesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getVehicles)
  .post(authorize('admin', 'receptionist'), createVehicle);

router
  .route('/:id')
  .get(getVehicle)
  .put(authorize('admin', 'receptionist'), updateVehicle)
  .delete(authorize('admin'), deleteVehicle);

module.exports = router;

