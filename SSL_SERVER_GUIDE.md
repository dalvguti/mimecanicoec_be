# MiMecanico ERP - SSL Server Configuration

## SSL-Enabled Server Setup

This configuration provides SSL support for your MiMecanico ERP backend server, optimized for cPanel deployment.

## Environment Variables

Add these variables to your `.env` file:

```env
# Basic Configuration
NODE_ENV=production
PORT=5000
SSL_PORT=5443

# Frontend URL (for CORS)
FRONTEND_URL=https://yourdomain.com

# SSL Certificate Paths (optional - cPanel usually handles SSL)
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
SSL_CA_PATH=/path/to/ca-bundle.crt

# Database Configuration
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
```

## Deployment Options

### Option 1: cPanel with SSL (Recommended)
Most cPanel hosting providers handle SSL certificates automatically. Use the standard server.js:

```bash
# Use the regular server.js
npm start
```

The server will detect SSL through reverse proxy headers.

### Option 2: Direct SSL with Certificates
If you have SSL certificates, use server-ssl.js:

```bash
# Update package.json scripts
"start:ssl": "node server-ssl.js"

# Run with SSL
npm run start:ssl
```

## cPanel Configuration

### 1. Upload Files
- Upload your backend files to `public_html/api/` or similar
- Upload frontend build to `public_html/`

### 2. Install SSL Certificate
- Go to cPanel → SSL/TLS
- Install Let's Encrypt certificate (free)
- Enable "Force HTTPS Redirect"

### 3. Configure Node.js App
- Go to cPanel → Node.js Selector
- Create new application
- Set startup file to `server.js` or `server-ssl.js`
- Set application root to your backend folder

### 4. Environment Variables
In cPanel Node.js app settings, add:
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
```

## Features

### SSL Support
- Automatic HTTPS detection
- SSL certificate validation
- Secure headers
- CORS configuration for HTTPS

### Security Features
- Force HTTPS redirect in production
- Secure error handling
- Health check endpoint
- Graceful shutdown

### Production Optimizations
- Environment-based configuration
- SSL certificate loading
- Reverse proxy support
- Error logging

## Testing

### Health Check
```bash
curl https://yourdomain.com/api/health
```

### SSL Test
```bash
curl -I https://yourdomain.com/api/
```

## Troubleshooting

### Common Issues:

1. **SSL Certificate Errors**
   - Verify certificate paths
   - Check certificate validity
   - Ensure proper file permissions

2. **CORS Issues**
   - Update FRONTEND_URL in .env
   - Check CORS configuration
   - Verify domain names

3. **Port Conflicts**
   - Use different ports for HTTP/HTTPS
   - Check cPanel port restrictions
   - Verify firewall settings

4. **Database Connection**
   - Verify SSL database connection
   - Check connection string
   - Test database connectivity

## Security Checklist

- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database SSL enabled
- [ ] Error handling configured
- [ ] Health monitoring enabled

## Support

For cPanel-specific issues:
1. Check cPanel error logs
2. Verify Node.js app configuration
3. Test SSL certificate validity
4. Contact hosting provider support
