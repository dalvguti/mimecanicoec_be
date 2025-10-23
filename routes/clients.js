const express = require('express');
const router = express.Router();
const {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientsController');
const { authorize } = require('../middleware/auth');

// All routes are protected (middleware applied at server level)
// Get all clients with role-based authorization
router.get('/', authorize('admin', 'receptionist', 'mechanic'), getClients);

// Create new client (admin and receptionist only)
router.post('/', authorize('admin', 'receptionist'), createClient);

// Client by ID routes
router
  .route('/:id')
  .get(getClient)
  .put(updateClient)
  .delete(authorize('admin'), deleteClient);

module.exports = router;

