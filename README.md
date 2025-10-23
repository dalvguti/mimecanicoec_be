# MiMecanico Backend API

Backend API for MiMecanico ERP - Repair Garage Management System

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your MySQL credentials:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mimecanico_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
```

4. Create and initialize the database:
```bash
# Login to MySQL
mysql -u root -p

# Run the SQL script
source config/db.sql
```

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Default Credentials

- **Username**: admin
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `PUT /api/clients/:id` - Update client

### Vehicles
- `GET /api/vehicles` - Get all vehicles
- `GET /api/vehicles/:id` - Get vehicle by ID
- `POST /api/vehicles` - Create vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get inventory item by ID
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/inventory/categories` - Get all categories
- `GET /api/inventory/services` - Get all services
- `POST /api/inventory/services` - Create service

### Work Orders
- `GET /api/work-orders` - Get all work orders
- `GET /api/work-orders/:id` - Get work order by ID
- `POST /api/work-orders` - Create work order
- `PUT /api/work-orders/:id` - Update work order
- `DELETE /api/work-orders/:id` - Delete work order

### Budgets
- `GET /api/budgets` - Get all budgets
- `GET /api/budgets/:id` - Get budget by ID
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/from-work-order/:workOrderId` - Create invoice from work order
- `PUT /api/invoices/:id` - Update invoice
- `POST /api/invoices/:id/payments` - Add payment to invoice
- `DELETE /api/invoices/:id` - Delete invoice

## User Roles

- **admin**: Full access to all features
- **receptionist**: Can manage orders, budgets, and invoices
- **mechanic**: Can view and update work orders
- **client**: Can view their own orders, budgets, and invoices

