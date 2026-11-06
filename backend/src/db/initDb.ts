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
    console.log(`Connected to "${ENV.DB.NAME}". Applying schema...`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await appClient.query(schemaSql);
    console.log('Schema applied successfully.');

    // Step 3: Seed initial default users
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    const staffPasswordHash = await bcrypt.hash('staff123', salt);

    await appClient.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('Admin User', 'admin@business.com', $1, 'admin'),
        ('Staff User', 'staff@business.com', $2, 'staff'),
        ('Admin User', 'admin@gmail.com', $1, 'admin'),
        ('Staff User', 'staff@gmail.com', $2, 'staff')
      ON CONFLICT (email) DO NOTHING;
    `, [adminPasswordHash, staffPasswordHash]);

    // Step 4: Seed sample products
    const prodRes = await appClient.query(`
      INSERT INTO products (name, sku, category, price, stock, low_stock_threshold, description)
      VALUES 
        ('Wireless Ergonomic Mouse', 'SKU-MOU-01', 'Electronics', 29.99, 45, 10, 'Rechargeable wireless ergonomic mouse with 2.4GHz USB receiver'),
        ('Mechanical Gaming Keyboard', 'SKU-KEY-02', 'Electronics', 89.50, 18, 5, 'RGB Backlit mechanical keyboard with brown switches'),
        ('USB-C Fast Charging Cable', 'SKU-CAB-03', 'Accessories', 12.00, 4, 15, 'Braided 2-meter USB-C to USB-C 100W PD Cable (LOW STOCK)'),
        ('Noise Cancelling Headphones', 'SKU-AUD-04', 'Electronics', 149.00, 3, 10, 'Over-ear active noise cancelling Bluetooth headphones (LOW STOCK)'),
        ('Laptop Stand Aluminum', 'SKU-ACC-05', 'Office', 35.00, 25, 8, 'Foldable portable aluminum riser stand for 10-17 inch laptops'),
        ('4K Ultra HD Webcam', 'SKU-CAM-06', 'Electronics', 79.99, 12, 10, 'High definition webcam with dual noise reduction microphones')
      ON CONFLICT (sku) DO NOTHING
      RETURNING id, name, price;
    `);

    // Step 5: Seed sample orders if none exist
    const ordersCount = await appClient.query(`SELECT COUNT(*) FROM orders`);
    if (parseInt(ordersCount.rows[0].count, 10) === 0) {
      console.log('Seeding initial orders & sales history...');
      const allProds = await appClient.query(`SELECT id, price FROM products ORDER BY id ASC`);
      const p1 = allProds.rows[0]?.id;
      const p2 = allProds.rows[1]?.id;
      const p3 = allProds.rows[2]?.id;

      if (p1 && p2) {
        // Order 1 (Delivered, 2 days ago)
        const o1 = await appClient.query(`
          INSERT INTO orders (order_number, customer_name, customer_email, status, total_amount, created_at)
          VALUES ('ORD-100234', 'Acme Corp (Sarah Jenkins)', 'sarah@acme.com', 'delivered', 149.48, CURRENT_TIMESTAMP - INTERVAL '2 days')
          RETURNING id;
        `);
        await appClient.query(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
          VALUES 
            ($1, $2, 2, 29.99, 59.98),
            ($1, $3, 1, 89.50, 89.50);
        `, [o1.rows[0].id, p1, p2]);

        // Order 2 (Paid, 1 day ago)
        const o2 = await appClient.query(`
          INSERT INTO orders (order_number, customer_name, customer_email, status, total_amount, created_at)
          VALUES ('ORD-100235', 'Nova Retail Group', 'procurement@novaretail.io', 'paid', 268.50, CURRENT_TIMESTAMP - INTERVAL '1 day')
          RETURNING id;
        `);
        await appClient.query(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
          VALUES 
            ($1, $2, 3, 89.50, 268.50);
        `, [o2.rows[0].id, p2]);

        // Order 3 (New, Today)
        const o3 = await appClient.query(`
          INSERT INTO orders (order_number, customer_name, customer_email, status, total_amount, created_at)
          VALUES ('ORD-100236', 'David Miller', 'david.m@gmail.com', 'new', 83.98, CURRENT_TIMESTAMP)
          RETURNING id;
        `);
        if (p3) {
          await appClient.query(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
            VALUES 
              ($1, $2, 2, 29.99, 59.98),
              ($1, $3, 2, 12.00, 24.00);
          `, [o3.rows[0].id, p1, p3]);
        }
      }
    }

    console.log('Seed data inserted successfully.');
    console.log('====================================');
    console.log('Default credentials created:');
    console.log('  Admin: admin@business.com / admin123 (Role: admin)');
    console.log('  Staff: staff@business.com / staff123 (Role: staff)');
    console.log('====================================');
  } catch (err: any) {
    console.error('Error during database initialization:', err);
  } finally {
    await appClient.end();
  }
}

initDatabase();

