const bcrypt = require('bcryptjs');
const db = require('../config/database');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (admin, receptionist)
exports.getUsers = async (req, res) => {
  try {
    const { role, active } = req.query;
    let query = 'SELECT id, username, email, first_name, last_name, phone, role, active, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await db.query(query, params);

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email, first_name, last_name, phone, role, active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is client, get client details
    let clientData = null;
    if (users[0].role === 'client') {
      const [clients] = await db.query(
        'SELECT * FROM clients WHERE user_id = ?',
        [req.params.id]
      );
      if (clients.length > 0) {
        clientData = clients[0];
      }
    }

    res.json({
      success: true,
      data: {
        ...users[0],
        clientData
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private (admin)
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, phone, role } = req.body;

    if (!username || !email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, first_name, last_name, phone, role]
    );

    const userId = result.insertId;

    // If role is client, create client record
    if (role === 'client') {
      await db.query('INSERT INTO clients (user_id) VALUES (?)', [userId]);
    }

    const [users] = await db.query(
      'SELECT id, username, email, first_name, last_name, phone, role, active FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (admin or own profile)
exports.updateUser = async (req, res) => {
  try {
    const { email, first_name, last_name, phone, active, password } = req.body;

    // Check if user exists
    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (first_name) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (active !== undefined && req.user.role === 'admin') {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedUsers] = await db.query(
      'SELECT id, username, email, first_name, last_name, phone, role, active FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedUsers[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (admin)
exports.deleteUser = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

