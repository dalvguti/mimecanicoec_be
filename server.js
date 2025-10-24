const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like calls from Postman or mobile apps)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'https://mimecanicoec.gutilopsa.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Auth routes (public)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (require authentication)
const { protect } = require('./middleware/auth');

app.use('/api/users', protect, require('./routes/users'));
app.use('/api/clients', protect, require('./routes/clients'));
app.use('/api/vehicles', protect, require('./routes/vehicles'));
app.use('/api/inventory', protect, require('./routes/inventory'));
app.use('/api/work-orders', protect, require('./routes/workOrders'));
app.use('/api/budgets', protect, require('./routes/budgets'));
app.use('/api/invoices', protect, require('./routes/invoices'));
app.use('/api/parameters', protect, require('./routes/parameters'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    protocol: req.protocol,
    secure: req.secure,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MiMecanico API',
    version: '1.0.0',
    authentication: 'JWT',
    endpoints: {
      health: '/api/health',
      // Public
      login: '/api/auth/login',
      register: '/api/auth/register',
      // Protected (require authentication)
      users: '/api/users',
      clients: '/api/clients',
      vehicles: '/api/vehicles',
      inventory: '/api/inventory',
      workOrders: '/api/work-orders',
      budgets: '/api/budgets',
      invoices: '/api/invoices',
      parameters: '/api/parameters'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Start HTTP server
http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Listening on: 0.0.0.0:${PORT}`);
});

// Start HTTPS server if enabled
if (USE_HTTPS) {
  const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'certs', 'server.crt');
  const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'certs', 'server.key');

  // Check if SSL certificates exist
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`HTTPS Server is running on port ${HTTPS_PORT}`);
      console.log(`SSL Certificate: ${certPath}`);
      console.log(`SSL Key: ${keyPath}`);
    });
  } else {
    console.warn('⚠️  HTTPS is enabled but SSL certificates not found!');
    console.warn(`Looking for:`);
    console.warn(`  - Certificate: ${certPath}`);
    console.warn(`  - Key: ${keyPath}`);
    console.warn(`Run 'npm run generate-certs' to create self-signed certificates for development`);
  }
} else {
  console.log('ℹ️  HTTPS is disabled. Set USE_HTTPS=true in .env to enable HTTPS');
}

// Export for external use
module.exports = app;

