import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

async function initDatabase() {
  console.log('🔄 Initializing Database connection...');
  
  // Step 1: Connect to default postgres DB to check/create the target DB
  const defaultClient = new Client({
    host: ENV.DB.HOST,
    port: ENV.DB.PORT,
    user: ENV.DB.USER,
    password: ENV.DB.PASSWORD,
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    const res = await defaultClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [ENV.DB.NAME]
    );

    if (res.rowCount === 0) {
      console.log(`Creating database "${ENV.DB.NAME}"...`);
      await defaultClient.query(`CREATE DATABASE "${ENV.DB.NAME}"`);
      console.log(`Database "${ENV.DB.NAME}" created successfully.`);
    } else {
      console.log(`Database "${ENV.DB.NAME}" already exists.`);
    }
  } catch (err: any) {
    console.warn(`Could not verify/create database via default postgres db:`, err.message);
  } finally {
    await defaultClient.end();
  }

  // Step 2: Connect to the specific database
  const appClient = new Client({
    host: ENV.DB.HOST,
    port: ENV.DB.PORT,
    user: ENV.DB.USER,
    password: ENV.DB.PASSWORD,
    database: ENV.DB.NAME,
  });

  try {
    await appClient.connect();
    console.log(`Connected to "${ENV.DB.NAME}". Applying schema & migrations...`);

    // Ensure columns exist FIRST on existing tables
    await appClient.query(`
      DO $$ 
      BEGIN 
        -- Update role constraint on users table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
          ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff', 'customer'));
        END IF;

        -- Add customer and payment columns to orders table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'telebirr';
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending_verification';
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS verification_notes TEXT;
        END IF;
      END $$;
    `);

    // Apply entire schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await appClient.query(schemaSql);

    console.log('Schema & migrations applied successfully.');

    // Step 3: Seed initial default users (Admin, Staff, Customer)
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const staffPasswordHash = await bcrypt.hash('staff123', salt);
    const customerPasswordHash = await bcrypt.hash('customer123', salt);

    await appClient.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('Admin User', 'admin@business.com', $1, 'admin'),
        ('Staff User', 'staff@business.com', $2, 'staff'),
        ('Customer User', 'customer@business.com', $3, 'customer'),
        ('Admin User', 'admin@gmail.com', $1, 'admin'),
        ('Staff User', 'staff@gmail.com', $2, 'staff'),
        ('Customer User', 'customer@gmail.com', $3, 'customer')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
    `, [adminPasswordHash, staffPasswordHash, customerPasswordHash]);

    // Step 4: Seed sample products
    await appClient.query(`
      INSERT INTO products (name, sku, category, price, stock, low_stock_threshold, description)
      VALUES 
        ('Wireless Ergonomic Mouse', 'SKU-MOU-01', 'Electronics', 29.99, 45, 10, 'Rechargeable wireless ergonomic mouse with 2.4GHz USB receiver'),
        ('Mechanical Gaming Keyboard', 'SKU-KEY-02', 'Electronics', 89.50, 18, 5, 'RGB Backlit mechanical keyboard with brown switches'),
        ('USB-C Fast Charging Cable', 'SKU-CAB-03', 'Accessories', 12.00, 4, 15, 'Braided 2-meter USB-C to USB-C 100W PD Cable (LOW STOCK)'),
        ('Noise Cancelling Headphones', 'SKU-AUD-04', 'Electronics', 149.00, 3, 10, 'Over-ear active noise cancelling Bluetooth headphones (LOW STOCK)'),
        ('Laptop Stand Aluminum', 'SKU-ACC-05', 'Office', 35.00, 25, 8, 'Foldable portable aluminum riser stand for 10-17 inch laptops'),
        ('4K Ultra HD Webcam', 'SKU-CAM-06', 'Electronics', 79.99, 12, 10, 'High definition webcam with dual noise reduction microphones')
      ON CONFLICT (sku) DO NOTHING;
    `);

    // Step 5: Update orders with payment details
    const customerUserRes = await appClient.query(`SELECT id FROM users WHERE email = 'customer@business.com' LIMIT 1`);
    const customerUserId = customerUserRes.rows[0]?.id || null;
    const staffUserRes = await appClient.query(`SELECT id FROM users WHERE email = 'staff@business.com' LIMIT 1`);
    const staffUserId = staffUserRes.rows[0]?.id || null;

    // Update existing orders with realistic payment records
    await appClient.query(`
      UPDATE orders 
      SET payment_method = 'telebirr', payment_reference = 'TB982348123', payment_status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP
      WHERE order_number = 'ORD-100234'
    `, [staffUserId]);

    await appClient.query(`
      UPDATE orders 
      SET payment_method = 'cbe', payment_reference = 'FT24018293847', payment_status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP
      WHERE order_number = 'ORD-100235'
    `, [staffUserId]);

    await appClient.query(`
      UPDATE orders 
      SET payment_method = 'cbebirr', payment_reference = 'CB778899221', payment_status = 'pending_verification', customer_id = $1
      WHERE order_number = 'ORD-100236'
    `, [customerUserId]);

    console.log('Seed data and payment methods verified successfully.');
    console.log('====================================');
    console.log('Default credentials available:');
    console.log('  Admin:    admin@business.com / admin123 (Role: admin)');
    console.log('  Staff:    staff@business.com / staff123 (Role: staff)');
    console.log('  Customer: customer@business.com / customer123 (Role: customer)');
    console.log('====================================');
  } catch (err: any) {
    console.error('Error during database initialization:', err);
  } finally {
    await appClient.end();
  }
}

initDatabase();
