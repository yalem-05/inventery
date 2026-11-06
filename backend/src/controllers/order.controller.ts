import { Response } from 'express';
import { pool, query } from '../config/db';
import { AuthenticatedRequest, OrderStatus } from '../types';

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.query;

  try {
    let sql = `
      SELECT o.*, u.name as created_by_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'sku', p.sku,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal', oi.subtotal
          )
        ) FILTER (WHERE oi.id IS NOT NULL) AS items
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
    `;

    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE o.status = $1`;
    }

    sql += ` GROUP BY o.id, u.name ORDER BY o.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve orders', details: error.message });
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { customer_name, customer_email, items } = req.body;
  const userId = req.user?.id;

  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Customer name and at least one item are required.' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify products & stock availability
    let calculatedTotal = 0;
    const validatedItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found.`);
      }

      const product = prodRes.rows[0];
      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) {
        throw new Error(`Invalid quantity for product ${product.name}. Must be greater than 0.`);
      }

      if (product.stock < qty) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`
        );
      }

      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * qty;
      calculatedTotal += subtotal;

      validatedItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        subtotal,
      });

      // Deduct stock
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [qty, product.id]
      );
    }

    // 2. Create the Order
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const orderRes = await client.query(
      `INSERT INTO orders (order_number, customer_name, customer_email, status, total_amount, created_by)
       VALUES ($1, $2, $3, 'new', $4, $5)
       RETURNING *`,
      [orderNumber, customer_name, customer_email || '', calculatedTotal, userId || null]
    );

    const createdOrder = orderRes.rows[0];

    // 3. Insert order items
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [createdOrder.id, item.productId, item.quantity, item.unitPrice, item.subtotal]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order created and inventory updated successfully.',
      data: { ...createdOrder, items: validatedItems },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message || 'Failed to create order' });
  } finally {
    client.release();
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses: OrderStatus[] = ['new', 'paid', 'delivered'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({
      error: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`,
    });
    return;
  }

  try {
    const result = await query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
};

