const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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

async function checkDatabaseConnection() {
  log('\n=== MiMecanico Database Connection Check ===\n', 'cyan');

  // Step 1: Check environment variables
  log('Step 1: Checking environment variables...', 'blue');
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    log(`✗ Missing environment variables: ${missingVars.join(', ')}`, 'red');
    log('Please check your .env file', 'yellow');
    return false;
  }

  log('✓ All required environment variables found', 'green');
  log(`  - DB_HOST: ${process.env.DB_HOST}`, 'reset');
  log(`  - DB_USER: ${process.env.DB_USER}`, 'reset');
  log(`  - DB_NAME: ${process.env.DB_NAME}`, 'reset');
  log(`  - DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(empty)'}`, 'reset');

  let connection;
  
  try {
    // Step 2: Test MySQL server connection
    log('\nStep 2: Testing MySQL server connection...', 'blue');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || ''
    });
    log('✓ Successfully connected to MySQL server', 'green');

    // Step 3: Check if database exists
    log('\nStep 3: Checking if database exists...', 'blue');
    const [databases] = await connection.query(
      'SHOW DATABASES LIKE ?',
      [process.env.DB_NAME]
    );

    if (databases.length === 0) {
      log(`✗ Database '${process.env.DB_NAME}' does not exist`, 'red');
      log('\nWould you like to create it? Run: node scripts/dbSetup.js', 'yellow');
      await connection.end();
      return false;
    }

    log(`✓ Database '${process.env.DB_NAME}' exists`, 'green');

    // Step 4: Connect to the specific database
    log('\nStep 4: Connecting to database...', 'blue');
    await connection.changeUser({ database: process.env.DB_NAME });
    log('✓ Successfully connected to database', 'green');

    // Step 5: Check tables
    log('\nStep 5: Checking database tables...', 'blue');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      log('✗ No tables found in database', 'red');
      log('\nRun setup script to create tables: node scripts/dbSetup.js', 'yellow');
      await connection.end();
      return false;
    }

    log(`✓ Found ${tables.length} tables:`, 'green');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      log(`  - ${tableName}`, 'reset');
    });

    // Step 6: Check if admin user exists
    log('\nStep 6: Checking for admin user...', 'blue');
    const [users] = await connection.query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );

    if (users[0].count === 0) {
      log('⚠ No admin users found', 'yellow');
      log('Run setup script to create default admin: node scripts/dbSetup.js', 'yellow');
    } else {
      log(`✓ Found ${users[0].count} admin user(s)`, 'green');
    }

    // Step 7: Check table counts
    log('\nStep 7: Database statistics...', 'blue');
    const tableNames = [
      'users', 'clients', 'vehicles', 'inventory_items', 
      'services', 'work_orders', 'budgets', 'invoices'
    ];

    for (const tableName of tableNames) {
      try {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        log(`  - ${tableName}: ${result[0].count} records`, 'reset');
      } catch (error) {
        log(`  - ${tableName}: Error checking (table might not exist)`, 'yellow');
      }
    }

    await connection.end();
    log('\n✓ Database check completed successfully!', 'green');
    log('\n=== All systems are ready ===\n', 'cyan');
    return true;

  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\nAccess denied. Please check your database credentials in .env file:', 'yellow');
      log('  - DB_USER', 'yellow');
      log('  - DB_PASSWORD', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('\nCannot connect to MySQL server. Please check:', 'yellow');
      log('  - Is MySQL server running?', 'yellow');
      log('  - Is DB_HOST correct in .env file?', 'yellow');
      log('  - Is MySQL listening on the correct port?', 'yellow');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      log(`\nDatabase '${process.env.DB_NAME}' does not exist`, 'yellow');
      log('Run: node scripts/dbSetup.js', 'yellow');
    }

    if (connection) {
      await connection.end();
    }
    return false;
  }
}

// Run the check
checkDatabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\nUnexpected error: ${error.message}`, 'red');
    process.exit(1);
  });

