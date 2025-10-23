const express = require('express');
const router = express.Router();
const {
  getClients,
  getClient,
  updateClient
} = require('../controllers/clientsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin', 'receptionist', 'mechanic'), getClients);

router
  .route('/:id')
  .get(getClient)
  .put(updateClient);

module.exports = router;

