const db = require('../config/database');

// Generate invoice number
const generateInvoiceNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const [result] = await db.query(
    'SELECT COUNT(*) as count FROM invoices WHERE YEAR(created_at) = ?',
    [year]
  );
  
  const count = result[0].count + 1;
  return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let query = `
      SELECT i.*, 
        u.first_name as client_first_name, u.last_name as client_last_name,
        wo.order_number as work_order_number
      FROM invoices i
      INNER JOIN clients c ON i.client_id = c.id
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN work_orders wo ON i.work_order_id = wo.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND i.client_id = ?';
      params.push(client_id);
    }

    // If user is a client, only show their invoices
    if (req.user.role === 'client') {
      query += ' AND c.user_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY i.created_at DESC';

    const [invoices] = await db.query(query, params);

    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const [invoices] = await db.query(`
      SELECT i.*, 
        c.id as client_id, c.company_name, c.tax_id, c.address, c.city, c.state, c.zip_code,
        u.first_name as client_first_name, u.last_name as client_last_name,
        u.email as client_email, u.phone as client_phone,
        wo.order_number as work_order_number
      FROM invoices i
      INNER JOIN clients c ON i.client_id = c.id
      INNER JOIN users u ON c.user_id = u.id
      LEFT JOIN work_orders wo ON i.work_order_id = wo.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get invoice items
    const [items] = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id',
      [req.params.id]
    );

    // Get payments
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...invoices[0],
        items,
        payments
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

// @desc    Create invoice from work order
// @route   POST /api/invoices/from-work-order/:workOrderId
// @access  Private (admin, receptionist)
exports.createInvoiceFromWorkOrder = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const workOrderId = req.params.workOrderId;

    // Get work order details
    const [workOrders] = await connection.query(
      'SELECT * FROM work_orders WHERE id = ?',
      [workOrderId]
    );

    if (workOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    const workOrder = workOrders[0];

    if (workOrder.status === 'invoiced') {
      return res.status(400).json({
        success: false,
        message: 'Work order already invoiced'
      });
    }

    const invoice_number = await generateInvoiceNumber();
    const issue_date = new Date().toISOString().split('T')[0];
    const due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days

    // Create invoice
    const [result] = await connection.query(
      `INSERT INTO invoices (
        invoice_number, work_order_id, client_id, issue_date, due_date,
        subtotal, tax_amount, discount_amount, total_amount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number, workOrderId, workOrder.client_id, issue_date, due_date,
        workOrder.subtotal, workOrder.tax_amount, workOrder.discount_amount, 
        workOrder.total_amount, req.user.id
      ]
    );

    const invoiceId = result.insertId;

    // Copy work order items to invoice
    const [woItems] = await connection.query(
      'SELECT * FROM work_order_items WHERE work_order_id = ?',
      [workOrderId]
    );

    for (const item of woItems) {
      await connection.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.quantity, item.unit_price, item.total]
      );
    }

    // Copy work order services to invoice
    const [woServices] = await connection.query(
      'SELECT * FROM work_order_services WHERE work_order_id = ?',
      [workOrderId]
    );

    for (const service of woServices) {
      await connection.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, `${service.description} (${service.hours} hrs)`, 1, service.total, service.total]
      );
    }

    // Update work order status
    await connection.query(
      'UPDATE work_orders SET status = ? WHERE id = ?',
      ['invoiced', workOrderId]
    );

    await connection.commit();

    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );

    res.status(201).json({
      success: true,
      data: invoices[0]
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

// @desc    Create manual invoice
// @route   POST /api/invoices
// @access  Private (admin, receptionist)
exports.createInvoice = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { 
      client_id, 
      issue_date,
      due_date,
      notes,
      items = []
    } = req.body;

    if (!client_id || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide client and items'
      });
    }

    const invoice_number = await generateInvoiceNumber();

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    });

    const tax_amount = subtotal * 0.12;
    const total_amount = subtotal + tax_amount;

    // Insert invoice
    const [result] = await connection.query(
      `INSERT INTO invoices (
        invoice_number, client_id, issue_date, due_date,
        subtotal, tax_amount, total_amount, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number, client_id, issue_date, due_date,
        subtotal, tax_amount, total_amount, notes, req.user.id
      ]
    );

    const invoiceId = result.insertId;

    // Insert items
    for (const item of items) {
      await connection.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    await connection.commit();

    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );

    res.status(201).json({
      success: true,
      data: invoices[0]
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

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const { status, payment_date, payment_method, notes } = req.body;

    const [invoices] = await db.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);

      if (status === 'paid' && !invoice.payment_date) {
        updates.push('payment_date = ?');
        params.push(payment_date || new Date().toISOString().split('T')[0]);
        updates.push('paid_amount = ?');
        params.push(invoice.total_amount);
      }
    }
    if (payment_method !== undefined) {
      updates.push('payment_method = ?');
      params.push(payment_method);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await db.query(
        `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedInvoices] = await db.query(
      'SELECT * FROM invoices WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedInvoices[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add payment to invoice
// @route   POST /api/invoices/:id/payments
// @access  Private
exports.addPayment = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { amount, payment_method, payment_date, reference_number, notes } = req.body;

    if (!amount || !payment_method || !payment_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide amount, payment method, and date'
      });
    }

    // Get invoice
    const [invoices] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [req.params.id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];

    // Insert payment
    await connection.query(
      'INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, amount, payment_method, payment_date, reference_number, notes, req.user.id]
    );

    // Update invoice
    const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
    let newStatus = invoice.status;

    if (newPaidAmount >= parseFloat(invoice.total_amount)) {
      newStatus = 'paid';
    }

    await connection.query(
      'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, newStatus, req.params.id]
    );

    await connection.commit();

    const [updatedInvoices] = await db.query(
      'SELECT * FROM invoices WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: updatedInvoices[0]
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

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (admin)
exports.deleteInvoice = async (req, res) => {
  try {
    const [invoices] = await db.query('SELECT id FROM invoices WHERE id = ?', [req.params.id]);

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await db.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

