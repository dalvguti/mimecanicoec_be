const db = require('../config/database');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventoryItems = async (req, res) => {
  try {
    const { category_id, active, low_stock } = req.query;
    let query = `
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND i.category_id = ?';
      params.push(category_id);
    }

    if (active !== undefined) {
      query += ' AND i.active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    if (low_stock === 'true') {
      query += ' AND i.stock_quantity <= i.min_stock_level';
    }

    query += ' ORDER BY i.name';

    const [items] = await db.query(query, params);

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
exports.getInventoryItem = async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private (admin, receptionist)
exports.createInventoryItem = async (req, res) => {
  try {
    const { category_id, code, name, description, unit_price, cost_price, stock_quantity, min_stock_level, unit } = req.body;

    if (!code || !name || unit_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if code already exists
    const [existing] = await db.query(
      'SELECT id FROM inventory_items WHERE code = ?',
      [code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Item code already exists'
      });
    }

    const [result] = await db.query(
      'INSERT INTO inventory_items (category_id, code, name, description, unit_price, cost_price, stock_quantity, min_stock_level, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [category_id, code, name, description, unit_price, cost_price || 0, stock_quantity || 0, min_stock_level || 0, unit || 'unit']
    );

    // Log initial stock transaction if stock_quantity > 0
    if (stock_quantity && stock_quantity > 0) {
      await db.query(
        'INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity, notes, created_by) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, 'adjustment', stock_quantity, 'Initial stock', req.user.id]
      );
    }

    const [items] = await db.query(
      'SELECT * FROM inventory_items WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (admin, receptionist)
exports.updateInventoryItem = async (req, res) => {
  try {
    const { category_id, code, name, description, unit_price, cost_price, stock_quantity, min_stock_level, unit, active } = req.body;

    const [items] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const oldItem = items[0];
    const updates = [];
    const params = [];

    if (category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(category_id);
    }
    if (code) {
      updates.push('code = ?');
      params.push(code);
    }
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (unit_price !== undefined) {
      updates.push('unit_price = ?');
      params.push(unit_price);
    }
    if (cost_price !== undefined) {
      updates.push('cost_price = ?');
      params.push(cost_price);
    }
    if (stock_quantity !== undefined) {
      updates.push('stock_quantity = ?');
      params.push(stock_quantity);
      
      // Log stock adjustment if quantity changed
      const quantityChange = stock_quantity - oldItem.stock_quantity;
      if (quantityChange !== 0) {
        await db.query(
          'INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity, notes, created_by) VALUES (?, ?, ?, ?, ?)',
          [req.params.id, 'adjustment', quantityChange, 'Manual adjustment', req.user.id]
        );
      }
    }
    if (min_stock_level !== undefined) {
      updates.push('min_stock_level = ?');
      params.push(min_stock_level);
    }
    if (unit) {
      updates.push('unit = ?');
      params.push(unit);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await db.query(
        `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedItems] = await db.query(
      'SELECT * FROM inventory_items WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedItems[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (admin)
exports.deleteInventoryItem = async (req, res) => {
  try {
    const [items] = await db.query('SELECT id FROM inventory_items WHERE id = ?', [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await db.query('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get inventory categories
// @route   GET /api/inventory/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT * FROM inventory_categories ORDER BY name'
    );

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get services
// @route   GET /api/inventory/services
// @access  Private
exports.getServices = async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM services WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    query += ' ORDER BY name';

    const [services] = await db.query(query, params);

    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create service
// @route   POST /api/inventory/services
// @access  Private (admin)
exports.createService = async (req, res) => {
  try {
    const { code, name, description, default_price, estimated_hours } = req.body;

    if (!code || !name || default_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const [result] = await db.query(
      'INSERT INTO services (code, name, description, default_price, estimated_hours) VALUES (?, ?, ?, ?, ?)',
      [code, name, description, default_price, estimated_hours]
    );

    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: services[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

