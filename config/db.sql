-- MiMecanico ERP Database Schema
CREATE DATABASE IF NOT EXISTS gutilops_mi_mecanico_ec_db;
USE gutilops_mi_mecanico_ec_db;

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  role ENUM('admin', 'mechanic', 'receptionist', 'client') NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clients Table (extended info for client users)
CREATE TABLE clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  company_name VARCHAR(100),
  tax_id VARCHAR(50),
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vehicles Table
CREATE TABLE vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  vin VARCHAR(50),
  color VARCHAR(30),
  mileage INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Inventory Categories
CREATE TABLE inventory_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items
CREATE TABLE inventory_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  min_stock_level INT DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'unit',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
);

-- Services (labor types)
CREATE TABLE services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  default_price DECIMAL(10, 2) NOT NULL,
  estimated_hours DECIMAL(5, 2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Work Orders
CREATE TABLE work_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  vehicle_id INT NOT NULL,
  client_id INT NOT NULL,
  assigned_mechanic_id INT,
  status ENUM('draft', 'pending', 'in_progress', 'completed', 'cancelled', 'invoiced') DEFAULT 'draft',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  problem_description TEXT,
  diagnosis TEXT,
  work_performed TEXT,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  mileage_in INT,
  mileage_out INT,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_mechanic_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Work Order Items (parts used)
CREATE TABLE work_order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id INT NOT NULL,
  inventory_item_id INT,
  description VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
);

-- Work Order Services (labor)
CREATE TABLE work_order_services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id INT NOT NULL,
  service_id INT,
  description VARCHAR(200) NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- Budgets/Estimates
CREATE TABLE budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  budget_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  vehicle_id INT,
  status ENUM('draft', 'sent', 'approved', 'rejected', 'expired') DEFAULT 'draft',
  valid_until DATE,
  description TEXT,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Budget Items
CREATE TABLE budget_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  budget_id INT NOT NULL,
  item_type ENUM('part', 'service') NOT NULL,
  description VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Invoices
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  work_order_id INT,
  budget_id INT,
  client_id INT NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Invoice Items
CREATE TABLE invoice_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  description VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Inventory Transactions
CREATE TABLE inventory_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inventory_item_id INT NOT NULL,
  transaction_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
  quantity INT NOT NULL,
  reference_type VARCHAR(50),
  reference_id INT,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- System Parameters Table
CREATE TABLE system_parameters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  param_key VARCHAR(100) UNIQUE NOT NULL,
  param_value TEXT NOT NULL,
  param_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  description TEXT,
  category VARCHAR(50),
  editable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, first_name, last_name, role) 
VALUES ('admin', 'admin@mimecanico.ec', '$2a$10$rZqJV.UpPJ4PJKcKIB/dv.wdECY7aqLc1MxJLQQZmXKVqJKXqJ.Y2', 'Admin', 'User', 'admin');

-- Insert sample inventory categories
INSERT INTO inventory_categories (name, description) VALUES
('Lubricants', 'Engine oils, transmission fluids, etc.'),
('Filters', 'Oil filters, air filters, fuel filters'),
('Brake Parts', 'Brake pads, discs, calipers'),
('Electrical', 'Batteries, spark plugs, alternators'),
('Tires', 'All types of tires'),
('Body Parts', 'Bumpers, doors, mirrors'),
('Tools', 'Workshop tools and equipment');

-- Insert sample services
INSERT INTO services (code, name, description, default_price, estimated_hours) VALUES
('OIL-CHANGE', 'Oil Change', 'Complete oil and filter change', 45.00, 0.5),
('BRAKE-SERVICE', 'Brake Service', 'Brake inspection and service', 120.00, 2.0),
('DIAG-GENERAL', 'General Diagnosis', 'Vehicle diagnostic service', 60.00, 1.0),
('TIRE-CHANGE', 'Tire Change', 'Change and balance tires', 80.00, 1.5),
('AC-SERVICE', 'A/C Service', 'Air conditioning service and recharge', 150.00, 2.0);

-- Insert default system parameters
INSERT INTO system_parameters (param_key, param_value, param_type, description, category, editable) VALUES
('tax_rate', '0.12', 'number', 'IVA tax rate (12% = 0.12)', 'financial', TRUE),
('tax_name', 'IVA', 'string', 'Tax name to display', 'financial', TRUE),
('currency', 'USD', 'string', 'Default currency', 'financial', TRUE),
('currency_symbol', '$', 'string', 'Currency symbol', 'financial', TRUE),
('company_name', 'MiMecanico', 'string', 'Company name', 'company', TRUE),
('company_phone', '', 'string', 'Company phone number', 'company', TRUE),
('company_email', 'info@mimecanico.ec', 'string', 'Company email', 'company', TRUE),
('company_address', '', 'string', 'Company address', 'company', TRUE),
('low_stock_threshold_percentage', '0.20', 'number', 'Alert when stock is 20% or below min level', 'inventory', TRUE),
('invoice_due_days', '30', 'number', 'Default invoice due days', 'financial', TRUE),
('budget_validity_days', '15', 'number', 'Default budget validity in days', 'financial', TRUE);

