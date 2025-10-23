const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('🔐 Generating SSL certificates for development...');

try {
  // Generate private key
  console.log('📝 Generating private key...');
  execSync(`openssl genrsa -out ${path.join(certsDir, 'server.key')} 2048`, { stdio: 'inherit' });

  // Generate certificate signing request
  console.log('📝 Generating certificate signing request...');
  execSync(`openssl req -new -key ${path.join(certsDir, 'server.key')} -out ${path.join(certsDir, 'server.csr')} -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, { stdio: 'inherit' });

  // Generate self-signed certificate
  console.log('📝 Generating self-signed certificate...');
  execSync(`openssl x509 -req -days 365 -in ${path.join(certsDir, 'server.csr')} -signkey ${path.join(certsDir, 'server.key')} -out ${path.join(certsDir, 'server.crt')}`, { stdio: 'inherit' });

  // Clean up CSR file
  fs.unlinkSync(path.join(certsDir, 'server.csr'));

  console.log('✅ SSL certificates generated successfully!');
  console.log(`📁 Certificate: ${path.join(certsDir, 'server.crt')}`);
  console.log(`🔑 Private Key: ${path.join(certsDir, 'server.key')}`);
  console.log('');
  console.log('⚠️  These are self-signed certificates for development only.');
  console.log('   For production, use certificates from a trusted Certificate Authority.');
  console.log('');
  console.log('🚀 You can now start the server with HTTPS enabled:');
  console.log('   npm run start:ssl');
  console.log('   or');
  console.log('   USE_HTTPS=true npm start');

} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('');
  console.log('💡 Make sure OpenSSL is installed on your system:');
  console.log('   - Windows: Install Git Bash or use WSL');
  console.log('   - macOS: Usually pre-installed');
  console.log('   - Linux: sudo apt-get install openssl');
  console.log('');
  console.log('🔄 Alternative: Set USE_HTTPS=false in your .env file to disable HTTPS');
}
