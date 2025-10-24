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
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://localhost:3000',
      'https://localhost:3001'
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

// Security middleware (disabled for cPanel compatibility)
// IMPORTANT: cPanel handles HTTPS redirects at the Apache/nginx level
// Enabling this middleware on cPanel will cause ERR_TOO_MANY_REDIRECTS
app.use((req, res, next) => {
  // Only redirect if explicitly enabled via environment variable
  // This should NEVER be enabled on cPanel hosting
  if (process.env.FORCE_HTTPS_REDIRECT === 'true' && 
      process.env.NODE_ENV === 'production' && 
      req.header('x-forwarded-proto') !== 'https') {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
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
    secure: req.secure || req.header('x-forwarded-proto') === 'https',
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
    ssl: req.secure || req.header('x-forwarded-proto') === 'https',
    environment: process.env.NODE_ENV || 'development',
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

const PORT = process.env.PORT || 5002;
const SSL_PORT = process.env.SSL_PORT || 5003;

// SSL Configuration
const sslOptions = {
  key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : null,
  cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : null,
  ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : null
};

// Start server based on environment
if (process.env.NODE_ENV === 'production') {
  // Production: Use HTTPS if SSL certificates are available
  if (sslOptions.key && sslOptions.cert) {
    const httpsServer = https.createServer(sslOptions, app);
    
    httpsServer.listen(SSL_PORT, () => {
      console.log(`🚀 MiMecanico API Server running on HTTPS port ${SSL_PORT}`);
      console.log(`🔒 SSL enabled with certificate`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
    
    // Also start HTTP server for redirects (optional)
    app.listen(PORT, () => {
      console.log(`🔄 HTTP server running on port ${PORT} (redirects to HTTPS)`);
    });
  } else {
    // Production without SSL certificates (cPanel handles SSL)
    app.listen(PORT, () => {
      console.log(`🚀 MiMecanico API Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`⚠️  SSL handled by cPanel/reverse proxy`);
    });
  }
} else {
  // Development: HTTP only
  app.listen(PORT, () => {
    console.log(`🚀 MiMecanico API Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Development mode - HTTP only`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
