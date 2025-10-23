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

async function setupDatabase() {
  log('\n=== MiMecanico Database Setup ===\n', 'cyan');

  let connection;

  try {
    // Step 1: Connect to MySQL server
    log('Step 1: Connecting to MySQL server...', 'blue');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    log('✓ Connected to MySQL server', 'green');

    // Step 2: Create database if not exists
    log('\nStep 2: Creating database if not exists...', 'blue');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    log(`✓ Database '${process.env.DB_NAME}' ready`, 'green');

    // Step 3: Use the database
    log('\nStep 3: Switching to database...', 'blue');
    await connection.query(`USE ${process.env.DB_NAME}`);
    log('✓ Database selected', 'green');

    // Step 4: Read SQL file
    log('\nStep 4: Reading SQL schema file...', 'blue');
    const sqlFilePath = path.join(__dirname, '..', 'config', 'db.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error('SQL file not found at: ' + sqlFilePath);
    }

    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    log('✓ SQL file loaded', 'green');

    // Step 5: Remove CREATE DATABASE and USE statements (we already did that)
    log('\nStep 5: Preparing SQL statements...', 'blue');
    sqlContent = sqlContent
      .replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/gi, '')
      .replace(/USE[^;]+;/gi, '');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    log(`✓ Found ${statements.length} SQL statements`, 'green');

    // Step 6: Execute SQL statements
    log('\nStep 6: Executing SQL statements...', 'blue');
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.query(statement);
        successCount++;
        
        // Log table creation
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (match) {
            log(`  ✓ Table: ${match[1]}`, 'green');
          }
        }
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          skipCount++;
        } else if (error.code === 'ER_DUP_ENTRY') {
          // Duplicate entry (like default admin user already exists)
          skipCount++;
        } else {
          log(`  ⚠ Warning: ${error.message}`, 'yellow');
        }
      }
    }

    log(`\n✓ Executed ${successCount} statements successfully`, 'green');
    if (skipCount > 0) {
      log(`  (Skipped ${skipCount} - already exist)`, 'yellow');
    }

    // Step 7: Verify tables
    log('\nStep 7: Verifying tables...', 'blue');
    const [tables] = await connection.query('SHOW TABLES');
    log(`✓ Database has ${tables.length} tables`, 'green');

    // Step 8: Check admin user
    log('\nStep 8: Verifying admin user...', 'blue');
    const [users] = await connection.query(
      'SELECT username, role FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );

    if (users.length > 0) {
      log('✓ Admin user exists', 'green');
      log(`  Username: ${users[0].username}`, 'reset');
      log('  Password: admin123 (change this after first login!)', 'yellow');
    } else {
      log('⚠ No admin user found', 'yellow');
    }

    // Step 9: Summary
    log('\n=== Setup Complete ===', 'cyan');
    log('\nDatabase Summary:', 'blue');
    
    const tableNames = ['users', 'clients', 'vehicles', 'inventory_items', 'services', 'work_orders', 'budgets', 'invoices'];
    for (const tableName of tableNames) {
      try {
        const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        log(`  - ${tableName}: ${result[0].count} records`, 'reset');
      } catch (error) {
        // Table doesn't exist
      }
    }

    log('\n✓ Database is ready to use!', 'green');
    log('\nYou can now start the server with: npm run dev\n', 'cyan');

    await connection.end();
    return true;

  } catch (error) {
    log(`\n✗ Setup failed: ${error.message}`, 'red');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('\nAccess denied. Please check your .env file:', 'yellow');
      log('  DB_USER and DB_PASSWORD must be correct', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('\nCannot connect to MySQL server:', 'yellow');
      log('  - Make sure MySQL is running', 'yellow');
      log('  - Check DB_HOST in .env file', 'yellow');
    }

    if (connection) {
      await connection.end();
    }
    return false;
  }
}

// Run setup
setupDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\nUnexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });

