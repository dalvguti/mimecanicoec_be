# cPanel Deployment Guide for MiMecanico

This guide provides step-by-step instructions for deploying the MiMecanico backend on cPanel hosting.

## ⚠️ Common Issues

### ERR_TOO_MANY_REDIRECTS
This error occurs when:
- Using `server-ssl.js` on cPanel (cPanel already handles SSL)
- HTTPS redirect middleware conflicts with cPanel's reverse proxy
- Multiple redirect rules are applied at different levels

**Solution**: Use `server.js` or `server-cpanel.js` instead of `server-ssl.js` on cPanel.

## 📋 Prerequisites

- cPanel hosting account with Node.js support
- SSH access (recommended)
- MySQL database created in cPanel
- Domain/subdomain configured

## 🚀 Deployment Steps

### 1. Choose the Correct Server File

**For cPanel Hosting, use one of these:**

#### Option A: Use `server.js` (Recommended)
```bash
npm start
```
- Standard server without SSL handling
- Lets cPanel handle HTTPS
- Best for most cPanel setups

#### Option B: Use `server-cpanel.js` (cPanel Optimized)
```bash
npm run start:cpanel
```
- Optimized specifically for cPanel
- Better error handling
- Detailed logging for cPanel environment

#### ❌ DO NOT Use `server-ssl.js` on cPanel
- This will cause ERR_TOO_MANY_REDIRECTS
- Only use for VPS/dedicated servers where you handle SSL directly

### 2. Setup Node.js Application in cPanel

1. **Login to cPanel**
2. **Navigate to "Setup Node.js App"**
3. **Create New Application:**
   - **Node.js version**: Select 14.x or higher
   - **Application mode**: Production
   - **Application root**: `/home/username/mimecanico-backend` (or your path)
   - **Application URL**: Your domain/subdomain
   - **Application startup file**: `server.js` or `server-cpanel.js`
   - **Environment variables**: (See section below)

### 3. Environment Variables Configuration

Add these environment variables in cPanel Node.js App settings:

```env
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# CORS Configuration
FRONTEND_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# IMPORTANT: Do NOT set these on cPanel
# USE_HTTPS=false (cPanel handles SSL)
# FORCE_HTTPS_REDIRECT=false (will cause redirect loop)
```

### 4. Upload Files to cPanel

#### Via File Manager:
1. Compress your backend folder into a zip file
2. Upload via cPanel File Manager
3. Extract in the application root directory

#### Via SSH (Recommended):
```bash
# Connect to your server
ssh username@yourdomain.com

# Navigate to your application directory
cd ~/mimecanico-backend

# Clone from git (if using version control)
git clone your-repo-url .

# Or upload via SCP from local machine
# scp -r ./backend/* username@yourdomain.com:~/mimecanico-backend/
```

### 5. Install Dependencies

In cPanel Node.js App interface or via SSH:

```bash
cd ~/mimecanico-backend
npm install --production
```

### 6. Setup Database

1. **Create MySQL Database in cPanel**
   - Database name: `username_mimecanico`
   - Database user: `username_dbuser`
   - Grant all privileges

2. **Run Database Setup Script**
   ```bash
   node scripts/dbSetup.js
   ```

3. **Verify Database Connection**
   ```bash
   node scripts/dbCheck.js
   ```

### 7. Start the Application

In cPanel Node.js App interface:
1. Click "Start App" button
2. Verify status shows "Running"
3. Check logs for any errors

Or via SSH:
```bash
npm start
```

### 8. Setup Apache/nginx Reverse Proxy (Usually Auto-configured)

cPanel typically auto-configures this, but verify in `.htaccess`:

```apache
# .htaccess in your public_html or subdomain root
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^/?(.*) https://%{SERVER_NAME}/$1 [R=301,L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]
```

### 9. Configure SSL Certificate (cPanel handles this)

1. **Navigate to "SSL/TLS" in cPanel**
2. **Use AutoSSL or Let's Encrypt**
   - cPanel can auto-install free SSL certificates
3. **Force HTTPS** at Apache level (not in Node.js)

## 🔧 Troubleshooting

### Issue: ERR_TOO_MANY_REDIRECTS

**Causes:**
- Using `server-ssl.js` instead of `server.js`
- HTTPS redirect enabled in both Node.js and Apache
- Multiple redirect rules conflicting

**Solutions:**
1. **Use the correct server file:**
   ```bash
   # Edit package.json or update cPanel settings
   # Use: server.js or server-cpanel.js
   ```

2. **Remove HTTPS redirect from Node.js:**
   - Don't set `FORCE_HTTPS_REDIRECT=true`
   - Let cPanel/Apache handle HTTPS

3. **Clear browser cache and cookies**

4. **Check .htaccess for conflicting rules**

### Issue: Application Won't Start

**Check:**
1. Node.js version compatibility (14.x or higher)
2. Port availability (default 5000)
3. Environment variables are set
4. Dependencies installed
5. Database connection is valid

**View Logs:**
```bash
# In cPanel Node.js App interface, click "Show Log"
# Or via SSH:
tail -f ~/nodevenv/mimecanico-backend/logs/app.log
```

### Issue: Database Connection Failed

**Solutions:**
1. Verify database credentials in environment variables
2. Check database hostname (usually `localhost` on cPanel)
3. Ensure database user has proper permissions
4. Test connection:
   ```bash
   node scripts/dbCheck.js
   ```

### Issue: CORS Errors

**Solutions:**
1. Update `FRONTEND_URL` in environment variables
2. Add your domain to allowed origins
3. Verify domain is accessible via HTTPS

### Issue: 502 Bad Gateway

**Causes:**
- Application crashed
- Port conflict
- Node.js process not running

**Solutions:**
1. Restart the application in cPanel
2. Check error logs for crash details
3. Verify port is not in use by another application

## 📊 Performance Optimization

### 1. Use PM2 for Process Management (if cPanel allows)
```bash
npm install -g pm2
pm2 start server.js --name mimecanico-api
pm2 startup
pm2 save
```

### 2. Enable Compression
Already included in the server configuration.

### 3. Database Connection Pooling
Already configured in `config/database.js`.

### 4. Monitor Resource Usage
- Check cPanel resource usage regularly
- Monitor database connections
- Review application logs

## 🔒 Security Best Practices

1. **Strong JWT Secret**
   - Use a long, random string
   - Never commit to version control

2. **Database Security**
   - Use strong passwords
   - Limit user permissions
   - Regular backups

3. **CORS Configuration**
   - Only allow trusted domains
   - Update `FRONTEND_URL` in environment

4. **Regular Updates**
   - Keep Node.js updated
   - Update dependencies regularly
   - Apply security patches

## 📝 Maintenance

### Updating the Application
```bash
# Via SSH
cd ~/mimecanico-backend
git pull origin main
npm install --production
# Restart via cPanel Node.js App interface
```

### Database Backup
```bash
# Via SSH or cPanel backup tool
mysqldump -u username -p database_name > backup.sql
```

### Monitoring
1. Check application logs regularly
2. Monitor API response times
3. Track error rates
4. Review resource usage

## 🆘 Quick Reference

### Correct Configuration for cPanel
```json
{
  "server_file": "server.js or server-cpanel.js",
  "use_https": false,
  "force_https_redirect": false,
  "ssl_handling": "cPanel/Apache handles it",
  "port": 5000
}
```

### Environment Variables Checklist
- ✅ NODE_ENV=production
- ✅ Database credentials set
- ✅ JWT_SECRET configured
- ✅ FRONTEND_URL set to your domain
- ❌ USE_HTTPS (don't set on cPanel)
- ❌ FORCE_HTTPS_REDIRECT (don't set on cPanel)

### Files to Use on cPanel
- ✅ `server.js` - Standard server
- ✅ `server-cpanel.js` - cPanel optimized
- ❌ `server-ssl.js` - Only for VPS/Dedicated servers

## 📞 Support

If you continue experiencing issues:
1. Check the error logs in cPanel
2. Verify all environment variables
3. Test database connection
4. Review the `ROUTE_FIX_SUMMARY.md` for API details
5. Consult your hosting provider's Node.js documentation
