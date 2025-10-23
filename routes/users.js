const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/usersController');
const { authorize } = require('../middleware/auth');

// All routes are protected (middleware applied at server level)

// Users management routes
router
  .route('/')
  .get(authorize('admin', 'receptionist'), getUsers)
  .post(authorize('admin'), createUser);

// User by ID routes
router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;

