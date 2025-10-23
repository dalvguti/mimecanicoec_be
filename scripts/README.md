# Database Scripts

This folder contains utility scripts for managing the MiMecanico database.

## Available Scripts

### 1. Check Database Connection (`dbCheck.js`)

Verifies the database connection and checks the current state of the database.

```bash
npm run db:check
# or
node scripts/dbCheck.js
```

**What it does:**
- ✅ Validates environment variables
- ✅ Tests MySQL server connection
- ✅ Checks if database exists
- ✅ Verifies all tables are created
- ✅ Checks for admin user
- ✅ Shows database statistics (record counts)

**Use this when:**
- You want to verify your setup
- Troubleshooting connection issues
- Checking database health

### 2. Setup Database (`dbSetup.js`)

Creates the database and all tables from the SQL schema file.

```bash
npm run db:setup
# or
node scripts/dbSetup.js
```

**What it does:**
- 📦 Creates database if it doesn't exist
- 📋 Creates all tables
- 👤 Creates default admin user
- 📊 Inserts sample data (categories, services)
- ✅ Verifies the setup

**Use this when:**
- First time setup
- Database doesn't exist
- Tables are missing
- Need to recreate the schema

**Safe to run multiple times** - it won't duplicate data or cause errors.

### 3. Reset Database (`dbReset.js`)

**⚠️ DANGER: Deletes all data and recreates the database**

```bash
npm run db:reset
# or
node scripts/dbReset.js
```

**What it does:**
- 🗑️ Drops the entire database
- 🔄 Runs setup to recreate everything
- 🔐 Requires confirmation (type database name)

**Use this when:**
- You want to start fresh
- Development/testing environment
- Database is corrupted

**⚠️ WARNING:** This will delete ALL your data permanently!

## Usage Examples

### First Time Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Make sure .env file is configured
# Edit .env with your MySQL credentials

# 3. Setup the database
npm run db:setup

# 4. Verify everything is working
npm run db:check

# 5. Start the server
npm run dev
```

### Troubleshooting Connection Issues

```bash
# Check what's wrong
npm run db:check

# Common issues it will identify:
# - Missing environment variables
# - Wrong MySQL credentials
# - MySQL server not running
# - Database doesn't exist
# - Missing tables
```

### Development Workflow

```bash
# After making changes to db.sql file
npm run db:setup

# Check if changes were applied
npm run db:check
```

### Starting Fresh (Development)

```bash
# Reset everything
npm run db:reset

# This will:
# 1. Delete all data
# 2. Recreate database
# 3. Create all tables
# 4. Insert default data
```

## Script Output

All scripts provide color-coded output:

- 🔵 **Blue**: Process step
- 🟢 **Green**: Success
- 🟡 **Yellow**: Warning
- 🔴 **Red**: Error
- 🔷 **Cyan**: Section headers

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mimecanico_db
JWT_SECRET=your_secret_key
```

## Exit Codes

All scripts follow standard exit codes:
- `0`: Success
- `1`: Error occurred

This allows them to be used in automated scripts and CI/CD pipelines.

## Error Messages

### "Access Denied"
- Check `DB_USER` and `DB_PASSWORD` in .env
- Make sure the MySQL user has proper permissions

### "Connection Refused"
- MySQL server is not running
- Check if MySQL is installed
- Verify `DB_HOST` in .env

### "Database does not exist"
- Run `npm run db:setup` to create it

### "No tables found"
- Run `npm run db:setup` to create tables

### "SQL file not found"
- Make sure `backend/config/db.sql` exists
- Don't move or rename this file

## Tips

1. **Run db:check first** - It's safe and tells you exactly what's wrong
2. **db:setup is safe** - You can run it multiple times without issues
3. **db:reset is dangerous** - Only use in development
4. **Keep .env secure** - Never commit it to git

## Integration with Other Tools

### In package.json scripts

You can chain these scripts:

```json
"scripts": {
  "fresh-start": "npm run db:reset && npm run dev",
  "verify-and-start": "npm run db:check && npm run dev"
}
```

### In CI/CD Pipeline

```bash
# In your deployment script
npm run db:check || npm run db:setup
npm run dev
```

### With Docker

```bash
# In Dockerfile or docker-compose
CMD ["sh", "-c", "npm run db:setup && npm run dev"]
```

## Support

If you encounter issues:

1. Run `npm run db:check` to diagnose
2. Check the error messages (they're descriptive)
3. Verify your .env file
4. Ensure MySQL is running
5. Check MySQL user permissions

