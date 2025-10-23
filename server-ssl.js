const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use((req, res, next) => {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/work-orders', require('./routes/workOrders'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/parameters', require('./routes/parameters'));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'MiMecanico API',
    version: '1.0.0',
    ssl: req.secure || req.header('x-forwarded-proto') === 'https',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ssl: req.secure || req.header('x-forwarded-proto') === 'https'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
const SSL_PORT = process.env.SSL_PORT || 5443;

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
