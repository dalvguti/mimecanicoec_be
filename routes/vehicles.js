const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  associateVehicle
} = require('../controllers/vehiclesController');
const { authorize } = require('../middleware/auth');

// All routes are protected (middleware applied at server level)

// Vehicles management routes
router
  .route('/')
  .get(getVehicles)
  .post(authorize('admin', 'receptionist'), createVehicle);

// Vehicle association route
router
  .route('/:id/associate')
  .put(authorize('admin', 'receptionist'), associateVehicle);

// Vehicle by ID routes
router
  .route('/:id')
  .get(getVehicle)
  .put(authorize('admin', 'receptionist'), updateVehicle)
  .delete(authorize('admin'), deleteVehicle);

module.exports = router;

