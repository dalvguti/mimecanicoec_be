const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fixAdminPassword() {
  log('\n=== Fix Admin Password ===\n', 'cyan');

  let connection;

  try {
    // Connect to database
    log('Connecting to database...', 'blue');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME
    });
    log('✓ Connected', 'green');

    // Check current admin user
    log('\nChecking current admin user...', 'blue');
    const [users] = await connection.query(
      'SELECT id, username, email, role FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length === 0) {
      log('✗ Admin user not found. Creating new admin user...', 'yellow');
      
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await connection.query(
        'INSERT INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin', 'admin@mimecanico.ec', hashedPassword, 'Admin', 'User', 'admin']
      );
      
      log('✓ Admin user created', 'green');
    } else {
      log(`✓ Found admin user: ${users[0].username} (${users[0].email})`, 'green');
      
      // Update password
      log('\nUpdating admin password to: admin123', 'blue');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await connection.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      
      log('✓ Password updated', 'green');
    }

    // Verify the password works
    log('\nVerifying password...', 'blue');
    const [verifyUsers] = await connection.query(
      'SELECT password FROM users WHERE username = ?',
      ['admin']
    );
    
    const isValid = await bcrypt.compare('admin123', verifyUsers[0].password);
    
    if (isValid) {
      log('✓ Password verification successful!', 'green');
      log('\nYou can now login with:', 'cyan');
      log('  Username: admin', 'reset');
      log('  Password: admin123\n', 'reset');
    } else {
      log('✗ Password verification failed', 'red');
    }

    await connection.end();
    return true;

  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    console.error(error);
    if (connection) {
      await connection.end();
    }
    return false;
  }
}

// Run
fixAdminPassword()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\nUnexpected error: ${error.message}`, 'red');
    process.exit(1);
  });

