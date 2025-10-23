const db = require('../config/database');

// @desc    Get all parameters
// @route   GET /api/parameters
// @access  Private
exports.getParameters = async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM system_parameters WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, param_key';

    const [parameters] = await db.query(query, params);

    // Convert to key-value object for easier frontend use
    const parametersObject = {};
    parameters.forEach(param => {
      let value = param.param_value;
      
      // Parse value based on type
      if (param.param_type === 'number') {
        value = parseFloat(value);
      } else if (param.param_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (param.param_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = param.param_value;
        }
      }
      
      parametersObject[param.param_key] = value;
    });

    res.json({
      success: true,
      count: parameters.length,
      data: parameters,
      parameters: parametersObject // Easy access object
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single parameter by key
// @route   GET /api/parameters/:key
// @access  Private
exports.getParameter = async (req, res) => {
  try {
    const [parameters] = await db.query(
      'SELECT * FROM system_parameters WHERE param_key = ?',
      [req.params.key]
    );

    if (parameters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parameter not found'
      });
    }

    const param = parameters[0];
    let value = param.param_value;
    
    // Parse value based on type
    if (param.param_type === 'number') {
      value = parseFloat(value);
    } else if (param.param_type === 'boolean') {
      value = value === 'true' || value === '1';
    } else if (param.param_type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = param.param_value;
      }
    }

    res.json({
      success: true,
      data: param,
      value: value
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update parameter
// @route   PUT /api/parameters/:key
// @access  Private (admin only)
exports.updateParameter = async (req, res) => {
  try {
    const { param_value, description } = req.body;

    // Check if parameter exists and is editable
    const [parameters] = await db.query(
      'SELECT * FROM system_parameters WHERE param_key = ?',
      [req.params.key]
    );

    if (parameters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parameter not found'
      });
    }

    const param = parameters[0];

    if (!param.editable) {
      return res.status(403).json({
        success: false,
        message: 'This parameter is not editable'
      });
    }

    // Validate value based on type
    let valueToStore = param_value;
    if (param.param_type === 'number') {
      if (isNaN(param_value)) {
        return res.status(400).json({
          success: false,
          message: 'Value must be a number'
        });
      }
      valueToStore = String(param_value);
    } else if (param.param_type === 'boolean') {
      valueToStore = param_value ? 'true' : 'false';
    } else if (param.param_type === 'json') {
      try {
        JSON.parse(param_value);
        valueToStore = param_value;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON value'
        });
      }
    }

    // Update parameter
    const updates = ['param_value = ?'];
    const params = [valueToStore];

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    params.push(req.params.key);

    await db.query(
      `UPDATE system_parameters SET ${updates.join(', ')} WHERE param_key = ?`,
      params
    );

    const [updatedParameters] = await db.query(
      'SELECT * FROM system_parameters WHERE param_key = ?',
      [req.params.key]
    );

    res.json({
      success: true,
      data: updatedParameters[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new parameter
// @route   POST /api/parameters
// @access  Private (admin only)
exports.createParameter = async (req, res) => {
  try {
    const { param_key, param_value, param_type, description, category, editable } = req.body;

    if (!param_key || param_value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide param_key and param_value'
      });
    }

    // Check if key already exists
    const [existing] = await db.query(
      'SELECT id FROM system_parameters WHERE param_key = ?',
      [param_key]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Parameter key already exists'
      });
    }

    const [result] = await db.query(
      'INSERT INTO system_parameters (param_key, param_value, param_type, description, category, editable) VALUES (?, ?, ?, ?, ?, ?)',
      [param_key, String(param_value), param_type || 'string', description, category, editable !== false]
    );

    const [parameters] = await db.query(
      'SELECT * FROM system_parameters WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: parameters[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete parameter
// @route   DELETE /api/parameters/:key
// @access  Private (admin only)
exports.deleteParameter = async (req, res) => {
  try {
    const [parameters] = await db.query(
      'SELECT * FROM system_parameters WHERE param_key = ?',
      [req.params.key]
    );

    if (parameters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parameter not found'
      });
    }

    if (!parameters[0].editable) {
      return res.status(403).json({
        success: false,
        message: 'This parameter cannot be deleted'
      });
    }

    await db.query('DELETE FROM system_parameters WHERE param_key = ?', [req.params.key]);

    res.json({
      success: true,
      message: 'Parameter deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get parameters by category
// @route   GET /api/parameters/category/:category
// @access  Private
exports.getParametersByCategory = async (req, res) => {
  try {
    const [parameters] = await db.query(
      'SELECT * FROM system_parameters WHERE category = ? ORDER BY param_key',
      [req.params.category]
    );

    const parametersObject = {};
    parameters.forEach(param => {
      let value = param.param_value;
      
      if (param.param_type === 'number') {
        value = parseFloat(value);
      } else if (param.param_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (param.param_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = param.param_value;
        }
      }
      
      parametersObject[param.param_key] = value;
    });

    res.json({
      success: true,
      count: parameters.length,
      data: parameters,
      parameters: parametersObject
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

