# Fix: ERR_TOO_MANY_REDIRECTS on cPanel

## 🔴 Problem
Getting `ERR_TOO_MANY_REDIRECTS` error when accessing your application on cPanel hosting.

## ✅ Quick Fix

### Option 1: Switch to the Correct Server File (Recommended)

**If you're using `server-ssl.js`, STOP and use `server.js` or `server-cpanel.js` instead.**

1. **In cPanel Node.js App Settings:**
   - Change "Application startup file" from `server-ssl.js` to `server.js`
   - Click "Save" and "Restart"

2. **Or update your package.json:**
   ```json
   {
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

### Option 2: Disable HTTPS Redirect in server-ssl.js

**If you must use server-ssl.js**, ensure this environment variable is NOT set:

```env
# In cPanel Node.js App environment variables
# DO NOT SET THIS:
# FORCE_HTTPS_REDIRECT=true
```

The redirect middleware is now disabled by default for cPanel compatibility.

## 🔍 Root Cause

cPanel handles HTTPS/SSL at the **Apache/nginx level** (reverse proxy). When your Node.js application also tries to redirect to HTTPS, it creates an infinite redirect loop:

```
User → Apache (redirects to HTTPS) → Node.js (redirects to HTTPS) → Apache (redirects to HTTPS) → ...
```

## 📋 Step-by-Step Solution

### Step 1: Check Which Server File You're Using

Via SSH:
```bash
cd ~/mimecanico-backend
cat package.json | grep "start"
```

Or check cPanel Node.js App settings:
- Look at "Application startup file"

### Step 2: Update to Correct Server File

#### Via cPanel Interface:
1. Go to "Setup Node.js App"
2. Click on your application
3. Change "Application startup file" to: `server.js`
4. Click "Save"
5. Click "Restart"

#### Via SSH:
```bash
cd ~/mimecanico-backend

# Edit package.json
nano package.json

# Change to:
{
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}

# Save and restart via cPanel
```

### Step 3: Verify Environment Variables

**Ensure these are NOT set:**
```env
USE_HTTPS=true
FORCE_HTTPS_REDIRECT=true
```

**Your environment should have:**
```env
NODE_ENV=production
PORT=5000
# ... other variables
```

### Step 4: Clear Browser Cache

1. Open browser in incognito/private mode
2. Or clear cache: `Ctrl+Shift+Delete`
3. Try accessing your application again

### Step 5: Restart Application

In cPanel Node.js App:
1. Click "Stop App"
2. Wait 5 seconds
3. Click "Start App"

## 🎯 Which Server File to Use?

### ✅ For cPanel Hosting:

**Use `server.js`** (Recommended)
```bash
npm start
```
- Standard server
- No SSL handling
- Lets cPanel manage everything

**Or use `server-cpanel.js`**
```bash
npm run start:cpanel
```
- Optimized for cPanel
- Better logging
- cPanel-specific configurations

### ❌ Do NOT Use on cPanel:

**`server-ssl.js`**
```bash
npm run start:ssl  # DON'T USE THIS ON CPANEL
```
- Only for VPS/Dedicated servers
- Handles SSL directly in Node.js
- Will cause redirect loops on cPanel

## 🔧 Additional Checks

### Check .htaccess File

Your `.htaccess` should have ONE redirect rule, not multiple:

```apache
RewriteEngine On

# Force HTTPS (ONE TIME ONLY)
RewriteCond %{HTTPS} !=on
RewriteRule ^/?(.*) https://%{SERVER_NAME}/$1 [R=301,L]

# Proxy to Node.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]
```

### Verify Apache Configuration

```bash
# Via SSH, check Apache config
grep -r "Redirect" /etc/apache2/sites-enabled/
```

## 🧪 Test Your Fix

1. **Access your domain**: `https://yourdomain.com`
2. **Check health endpoint**: `https://yourdomain.com/api/health`
3. **Should see**:
   ```json
   {
     "status": "OK",
     "message": "Server is running",
     "timestamp": "...",
     "protocol": "https",
     "environment": "production"
   }
   ```

## 📊 Verification Checklist

- [ ] Using `server.js` or `server-cpanel.js` (not `server-ssl.js`)
- [ ] `FORCE_HTTPS_REDIRECT` is NOT set in environment
- [ ] `USE_HTTPS` is NOT set or is set to `false`
- [ ] Application restarted in cPanel
- [ ] Browser cache cleared
- [ ] Can access `https://yourdomain.com/api/health`
- [ ] No redirect loop errors

## ⚠️ If Still Not Working

1. **Check Application Logs:**
   ```bash
   # Via SSH
   tail -f ~/nodevenv/mimecanico-backend/logs/*.log
   ```

2. **Check Apache Error Logs:**
   ```bash
   tail -f /var/log/apache2/error.log
   ```

3. **Test without HTTPS:**
   - Temporarily disable HTTPS redirect in .htaccess
   - Try accessing via HTTP: `http://yourdomain.com/api/health`
   - If it works, the issue is with HTTPS redirect configuration

4. **Contact Your Hosting Provider:**
   - They can check reverse proxy configuration
   - Verify SSL certificate is properly installed
   - Check for any server-level redirect rules

## 📚 Related Documentation

- `CPANEL_DEPLOYMENT_GUIDE.md` - Complete cPanel deployment guide
- `ROUTING_IMPLEMENTATION_SUMMARY.md` - Routing configuration details
- `ENVIRONMENT_SETUP.md` - Environment variables reference

## 💡 Prevention

To avoid this issue in the future:

1. **Always use `server.js` on cPanel**
2. **Let cPanel handle SSL/HTTPS**
3. **Don't set HTTPS redirect flags**
4. **Document your server configuration**
5. **Test after any configuration changes**
