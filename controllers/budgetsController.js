const db = require('../config/database');

// Generate budget number
const generateBudgetNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const [result] = await db.query(
    'SELECT COUNT(*) as count FROM budgets WHERE YEAR(created_at) = ?',
    [year]
  );
  
  const count = result[0].count + 1;
  return `BUD-${year}${month}-${String(count).padStart(4, '0')}`;
};

// @desc    Get all budgets
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let query = `
      SELECT b.*, 
        v.plate_number, v.brand, v.model,
        u.first_name as client_first_name, u.last_name as client_last_name
      FROM budgets b
      INNER JOIN clients c ON b.client_id = c.id
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND b.client_id = ?';
      params.push(client_id);
    }

    // If user is a client, only show their budgets
    if (req.user.role === 'client') {
      query += ' AND c.user_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY b.created_at DESC';

    const [budgets] = await db.query(query, params);

    res.json({
      success: true,
      count: budgets.length,
      data: budgets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single budget
// @route   GET /api/budgets/:id
// @access  Private
exports.getBudget = async (req, res) => {
  try {
    const [budgets] = await db.query(`
      SELECT b.*, 
        v.plate_number, v.brand, v.model, v.year,
        c.id as client_id,
        u.first_name as client_first_name, u.last_name as client_last_name,
        u.email as client_email, u.phone as client_phone
      FROM budgets b
      INNER JOIN clients c ON b.client_id = c.id
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Get budget items
    const [items] = await db.query(
      'SELECT * FROM budget_items WHERE budget_id = ? ORDER BY id',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...budgets[0],
        items
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

// @desc    Create budget
// @route   POST /api/budgets
// @access  Private (admin, receptionist)
exports.createBudget = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { 
      client_id, 
      vehicle_id,
      description,
      valid_until,
      notes,
      items = [],
      services = []
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide client'
      });
    }

    const budget_number = await generateBudgetNumber();

    // Calculate totals
    let itemsSubtotal = 0;
    items.forEach(item => {
      itemsSubtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    });

    let servicesSubtotal = 0;
    services.forEach(service => {
      servicesSubtotal += parseFloat(service.hours) * parseFloat(service.rate);
    });

    const subtotal = itemsSubtotal + servicesSubtotal;
    const tax_amount = subtotal * 0.12; // 12% IVA
    const total_amount = subtotal + tax_amount;

    // Insert budget
    const [result] = await connection.query(
      `INSERT INTO budgets (
        budget_number, client_id, vehicle_id, description, valid_until,
        subtotal, tax_amount, total_amount, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget_number, client_id, vehicle_id, description, valid_until,
        subtotal, tax_amount, total_amount, notes, req.user.id
      ]
    );

    const budgetId = result.insertId;

    // Insert items (parts/materials)
    for (const item of items) {
      await connection.query(
        'INSERT INTO budget_items (budget_id, item_type, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
        [budgetId, 'part', item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    // Insert services (labor)
    for (const service of services) {
      await connection.query(
        'INSERT INTO budget_items (budget_id, item_type, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
        [budgetId, 'service', service.description, service.hours, service.rate, service.hours * service.rate]
      );
    }

    await connection.commit();

    const [budgets] = await db.query(
      'SELECT * FROM budgets WHERE id = ?',
      [budgetId]
    );

    res.status(201).json({
      success: true,
      data: budgets[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  } finally {
    connection.release();
  }
};

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    const { status, description, valid_until, notes } = req.body;

    const [budgets] = await db.query('SELECT id FROM budgets WHERE id = ?', [req.params.id]);

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (valid_until !== undefined) {
      updates.push('valid_until = ?');
      params.push(valid_until);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await db.query(
        `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedBudgets] = await db.query(
      'SELECT * FROM budgets WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedBudgets[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private (admin)
exports.deleteBudget = async (req, res) => {
  try {
    const [budgets] = await db.query('SELECT id FROM budgets WHERE id = ?', [req.params.id]);

    if (budgets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await db.query('DELETE FROM budgets WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

