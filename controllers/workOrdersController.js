const db = require('../config/database');

// Generate order number
const generateOrderNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const [result] = await db.query(
    'SELECT COUNT(*) as count FROM work_orders WHERE YEAR(created_at) = ?',
    [year]
  );
  
  const count = result[0].count + 1;
  return `WO-${year}${month}-${String(count).padStart(4, '0')}`;
};

// @desc    Get all work orders
// @route   GET /api/work-orders
// @access  Private
exports.getWorkOrders = async (req, res) => {
  try {
    const { status, client_id, mechanic_id } = req.query;
    let query = `
      SELECT wo.*, 
        v.plate_number, v.brand, v.model, v.year,
        c.id as client_id,
        u_client.first_name as client_first_name, u_client.last_name as client_last_name,
        u_mechanic.first_name as mechanic_first_name, u_mechanic.last_name as mechanic_last_name
      FROM work_orders wo
      INNER JOIN vehicles v ON wo.vehicle_id = v.id
      INNER JOIN clients c ON wo.client_id = c.id
      INNER JOIN users u_client ON c.user_id = u_client.id
      LEFT JOIN users u_mechanic ON wo.assigned_mechanic_id = u_mechanic.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND wo.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND wo.client_id = ?';
      params.push(client_id);
    }

    if (mechanic_id) {
      query += ' AND wo.assigned_mechanic_id = ?';
      params.push(mechanic_id);
    }

    // If user is a client, only show their orders
    if (req.user.role === 'client') {
      query += ' AND c.user_id = ?';
      params.push(req.user.id);
    }

    // If user is a mechanic, show orders assigned to them
    if (req.user.role === 'mechanic') {
      query += ' AND wo.assigned_mechanic_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY wo.created_at DESC';

    const [orders] = await db.query(query, params);

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single work order
// @route   GET /api/work-orders/:id
// @access  Private
exports.getWorkOrder = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT wo.*, 
        v.plate_number, v.brand, v.model, v.year, v.vin, v.color,
        c.id as client_id,
        u_client.first_name as client_first_name, u_client.last_name as client_last_name,
        u_client.email as client_email, u_client.phone as client_phone,
        u_mechanic.first_name as mechanic_first_name, u_mechanic.last_name as mechanic_last_name
      FROM work_orders wo
      INNER JOIN vehicles v ON wo.vehicle_id = v.id
      INNER JOIN clients c ON wo.client_id = c.id
      INNER JOIN users u_client ON c.user_id = u_client.id
      LEFT JOIN users u_mechanic ON wo.assigned_mechanic_id = u_mechanic.id
      WHERE wo.id = ?
    `, [req.params.id]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    // Get work order items
    const [items] = await db.query(`
      SELECT woi.*, i.name as item_name
      FROM work_order_items woi
      LEFT JOIN inventory_items i ON woi.inventory_item_id = i.id
      WHERE woi.work_order_id = ?
    `, [req.params.id]);

    // Get work order services
    const [services] = await db.query(`
      SELECT wos.*, s.name as service_name
      FROM work_order_services wos
      LEFT JOIN services s ON wos.service_id = s.id
      WHERE wos.work_order_id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...orders[0],
        items,
        services
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

// @desc    Create work order
// @route   POST /api/work-orders
// @access  Private (admin, receptionist)
exports.createWorkOrder = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { 
      vehicle_id, 
      client_id, 
      assigned_mechanic_id,
      problem_description,
      priority,
      estimated_completion_date,
      mileage_in,
      notes,
      items = [],
      services = []
    } = req.body;

    if (!vehicle_id || !client_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide vehicle and client'
      });
    }

    const order_number = await generateOrderNumber();

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    });
    services.forEach(service => {
      subtotal += parseFloat(service.hours) * parseFloat(service.rate);
    });

    const tax_amount = subtotal * 0.12; // 12% IVA for Ecuador
    const total_amount = subtotal + tax_amount;

    // Insert work order
    const [result] = await connection.query(
      `INSERT INTO work_orders (
        order_number, vehicle_id, client_id, assigned_mechanic_id, 
        problem_description, priority, estimated_completion_date, mileage_in, 
        subtotal, tax_amount, total_amount, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_number, vehicle_id, client_id, assigned_mechanic_id,
        problem_description, priority || 'normal', estimated_completion_date, mileage_in,
        subtotal, tax_amount, total_amount, notes, req.user.id
      ]
    );

    const workOrderId = result.insertId;

    // Insert items
    for (const item of items) {
      await connection.query(
        'INSERT INTO work_order_items (work_order_id, inventory_item_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
        [workOrderId, item.inventory_item_id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );

      // Update inventory if item has inventory_item_id
      if (item.inventory_item_id) {
        await connection.query(
          'UPDATE inventory_items SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.inventory_item_id]
        );

        await connection.query(
          'INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity, reference_type, reference_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [item.inventory_item_id, 'sale', -item.quantity, 'work_order', workOrderId, req.user.id]
        );
      }
    }

    // Insert services
    for (const service of services) {
      await connection.query(
        'INSERT INTO work_order_services (work_order_id, service_id, description, hours, rate, total) VALUES (?, ?, ?, ?, ?, ?)',
        [workOrderId, service.service_id, service.description, service.hours, service.rate, service.hours * service.rate]
      );
    }

    await connection.commit();

    const [orders] = await db.query(
      'SELECT * FROM work_orders WHERE id = ?',
      [workOrderId]
    );

    res.status(201).json({
      success: true,
      data: orders[0]
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

// @desc    Update work order
// @route   PUT /api/work-orders/:id
// @access  Private
exports.updateWorkOrder = async (req, res) => {
  try {
    const { 
      status, 
      assigned_mechanic_id, 
      diagnosis, 
      work_performed,
      actual_completion_date,
      mileage_out,
      notes
    } = req.body;

    const [orders] = await db.query('SELECT id FROM work_orders WHERE id = ?', [req.params.id]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (assigned_mechanic_id !== undefined) {
      updates.push('assigned_mechanic_id = ?');
      params.push(assigned_mechanic_id);
    }
    if (diagnosis !== undefined) {
      updates.push('diagnosis = ?');
      params.push(diagnosis);
    }
    if (work_performed !== undefined) {
      updates.push('work_performed = ?');
      params.push(work_performed);
    }
    if (actual_completion_date !== undefined) {
      updates.push('actual_completion_date = ?');
      params.push(actual_completion_date);
    }
    if (mileage_out !== undefined) {
      updates.push('mileage_out = ?');
      params.push(mileage_out);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await db.query(
        `UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedOrders] = await db.query(
      'SELECT * FROM work_orders WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedOrders[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete work order
// @route   DELETE /api/work-orders/:id
// @access  Private (admin)
exports.deleteWorkOrder = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT id FROM work_orders WHERE id = ?', [req.params.id]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    await db.query('DELETE FROM work_orders WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Work order deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

