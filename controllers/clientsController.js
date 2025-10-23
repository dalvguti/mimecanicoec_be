const db = require('../config/database');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    const [clients] = await db.query(`
      SELECT c.*, u.username, u.email, u.first_name, u.last_name, u.phone, u.active
      FROM clients c
      INNER JOIN users u ON c.user_id = u.id
      WHERE u.role = 'client'
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
exports.getClient = async (req, res) => {
  try {
    const [clients] = await db.query(`
      SELECT c.*, u.username, u.email, u.first_name, u.last_name, u.phone, u.active
      FROM clients c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get client's vehicles
    const [vehicles] = await db.query(
      'SELECT * FROM vehicles WHERE client_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...clients[0],
        vehicles
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

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
  try {
    const { company_name, tax_id, address, city, state, zip_code, notes } = req.body;

    const [clients] = await db.query('SELECT id FROM clients WHERE id = ?', [req.params.id]);

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const updates = [];
    const params = [];

    if (company_name !== undefined) {
      updates.push('company_name = ?');
      params.push(company_name);
    }
    if (tax_id !== undefined) {
      updates.push('tax_id = ?');
      params.push(tax_id);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      params.push(city);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      params.push(state);
    }
    if (zip_code !== undefined) {
      updates.push('zip_code = ?');
      params.push(zip_code);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await db.query(
        `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedClients] = await db.query(`
      SELECT c.*, u.username, u.email, u.first_name, u.last_name, u.phone
      FROM clients c
      INNER JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      data: updatedClients[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

