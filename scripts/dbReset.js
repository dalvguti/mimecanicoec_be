const mysql = require('mysql2/promise');
const readline = require('readline');
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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function resetDatabase() {
  log('\n=== MiMecanico Database Reset ===\n', 'cyan');
  log('⚠ WARNING: This will delete ALL data in the database!', 'red');
  log('This action cannot be undone.\n', 'red');

  const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    log('\nReset cancelled.', 'yellow');
    return false;
  }

  const confirm = await askQuestion('\nType the database name to confirm: ');

  if (confirm !== process.env.DB_NAME) {
    log('\nDatabase name does not match. Reset cancelled.', 'yellow');
    return false;
  }

  let connection;

  try {
    log('\nConnecting to MySQL server...', 'blue');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || ''
    });
    log('✓ Connected', 'green');

    log('\nDropping database...', 'blue');
    await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    log(`✓ Database '${process.env.DB_NAME}' dropped`, 'green');

    await connection.end();

    log('\nNow running setup to recreate database...', 'blue');
    log('===========================================\n', 'blue');

    // Run the setup script
    const { execSync } = require('child_process');
    execSync('node scripts/dbSetup.js', { stdio: 'inherit' });

    return true;

  } catch (error) {
    log(`\n✗ Reset failed: ${error.message}`, 'red');
    if (connection) {
      await connection.end();
    }
    return false;
  }
}

// Run reset
resetDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\nUnexpected error: ${error.message}`, 'red');
    process.exit(1);
  });

