const db = require('../config/database');

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
exports.getVehicles = async (req, res) => {
  try {
    const { client_id } = req.query;
    let query = `
      SELECT v.*, v.client_id, c.id as client_table_id, u.first_name, u.last_name, u.email
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (client_id) {
      query += ' AND v.client_id = ?';
      params.push(client_id);
    }

    query += ' ORDER BY v.created_at DESC';

    const [vehicles] = await db.query(query, params);

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
exports.getVehicle = async (req, res) => {
  try {
    const [vehicles] = await db.query(`
      SELECT v.*, c.id as client_id, u.first_name, u.last_name, u.email, u.phone
      FROM vehicles v
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE v.id = ?
    `, [req.params.id]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      data: vehicles[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create vehicle
// @route   POST /api/vehicles
// @access  Private
exports.createVehicle = async (req, res) => {
  try {
    const { client_id, plate_number, brand, model, year, vin, color, mileage, notes } = req.body;

    // Make client_id optional (can be null)
    if (!plate_number || !brand || !model || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (plate_number, brand, model, year)'
      });
    }

    // Check if plate number already exists
    const [existing] = await db.query(
      'SELECT id FROM vehicles WHERE plate_number = ?',
      [plate_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Plate number already exists'
      });
    }

    const [result] = await db.query(
      'INSERT INTO vehicles (client_id, plate_number, brand, model, year, vin, color, mileage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [client_id || null, plate_number, brand, model, year, vin || null, color || null, mileage || null, notes || null]
    );

    const [vehicles] = await db.query(
      'SELECT * FROM vehicles WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: vehicles[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Associate vehicle with client
// @route   PUT /api/vehicles/:id/associate
// @access  Private
exports.associateVehicle = async (req, res) => {
  try {
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide client_id'
      });
    }

    const [vehicles] = await db.query('SELECT id FROM vehicles WHERE id = ?', [req.params.id]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Update vehicle with client_id
    await db.query(
      'UPDATE vehicles SET client_id = ? WHERE id = ?',
      [client_id, req.params.id]
    );

    const [updatedVehicles] = await db.query(
      'SELECT * FROM vehicles WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedVehicles[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private
exports.updateVehicle = async (req, res) => {
  try {
    const { client_id, plate_number, brand, model, year, vin, color, mileage, notes } = req.body;

    const [vehicles] = await db.query('SELECT id FROM vehicles WHERE id = ?', [req.params.id]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const updates = [];
    const params = [];

    if (client_id !== undefined) {
      updates.push('client_id = ?');
      params.push(client_id || null);
    }
    if (plate_number) {
      updates.push('plate_number = ?');
      params.push(plate_number);
    }
    if (brand) {
      updates.push('brand = ?');
      params.push(brand);
    }
    if (model) {
      updates.push('model = ?');
      params.push(model);
    }
    if (year) {
      updates.push('year = ?');
      params.push(year);
    }
    if (vin !== undefined) {
      updates.push('vin = ?');
      params.push(vin);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (mileage !== undefined) {
      updates.push('mileage = ?');
      params.push(mileage);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id);

    await db.query(
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedVehicles] = await db.query(
      'SELECT * FROM vehicles WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedVehicles[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (admin)
exports.deleteVehicle = async (req, res) => {
  try {
    const [vehicles] = await db.query('SELECT id FROM vehicles WHERE id = ?', [req.params.id]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    await db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

