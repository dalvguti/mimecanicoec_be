# Environment Setup Guide

This guide explains how to configure the MiMecanico backend environment variables.

## Environment Variables

Create a `.env` file in the backend root directory with the following variables:

```env
# MiMecanico Backend Environment Configuration

# Server Configuration
NODE_ENV=development
PORT=5000
HTTPS_PORT=5443
USE_HTTPS=false

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mimecanico_db
DB_USER=root
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# SSL Configuration (for production with direct SSL)
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key
SSL_CA_PATH=./certs/ca.crt

# Email Configuration (if needed)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Configuration Details

### Server Configuration
- `NODE_ENV`: Set to `development` for development, `production` for production
- `PORT`: HTTP server port (default: 5000)
- `HTTPS_PORT`: HTTPS server port (default: 5443)
- `USE_HTTPS`: Enable/disable HTTPS server (default: false)

### Database Configuration
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 3306 for MySQL)
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password

### JWT Configuration
- `JWT_SECRET`: Secret key for JWT tokens (CHANGE THIS IN PRODUCTION!)
- `JWT_EXPIRE`: Access token expiration time (default: 24h)
- `JWT_REFRESH_EXPIRE`: Refresh token expiration time (default: 7d)

### CORS Configuration
- `FRONTEND_URL`: Frontend application URL for CORS
- `ADMIN_URL`: Admin panel URL for CORS

### SSL Configuration
- `SSL_CERT_PATH`: Path to SSL certificate file
- `SSL_KEY_PATH`: Path to SSL private key file
- `SSL_CA_PATH`: Path to SSL certificate authority file (optional)

## Quick Start

1. Copy the environment variables above into a `.env` file
2. Update the database credentials
3. Generate a strong JWT secret key
4. Set the appropriate frontend URLs
5. Start the server with `npm start`

## Security Notes

- **NEVER** commit the `.env` file to version control
- Use strong, unique JWT secrets in production
- Ensure database credentials are secure
- Use HTTPS in production environments
- Regularly rotate JWT secrets

## Development vs Production

### Development
- Use `NODE_ENV=development`
- HTTPS is optional
- Debug logging enabled
- Relaxed CORS settings

### Production
- Use `NODE_ENV=production`
- Enable HTTPS
- Strict CORS settings
- Strong JWT secrets
- Secure database credentials
