import { Response } from 'express';
import { pool, query } from '../config/db';
import { AuthenticatedRequest, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, payment_status } = req.query;
  const user = req.user;

  try {
    let sql = `
      SELECT 
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.customer_id,
        o.status,
        o.payment_method,
        o.payment_reference,
        o.payment_status,
        o.verified_by,
        v.name AS verified_by_name,
        o.verified_at,
        o.verification_notes,
        o.total_amount,
        o.created_by,
        u.name AS created_by_name,
        o.created_at,
        o.updated_at,
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
      LEFT JOIN users v ON o.verified_by = v.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Customer privacy: regular customers only see their own orders
    if (user?.role === 'customer') {
      params.push(user.id);
      sql += ` AND o.customer_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }

    if (payment_status) {
      params.push(payment_status);
      sql += ` AND o.payment_status = $${params.length}`;
    }

    sql += ` GROUP BY o.id, u.name, v.name ORDER BY o.created_at DESC`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve orders', details: error.message });
  }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { customer_name, customer_email, items, payment_method, payment_reference } = req.body;
  const user = req.user;

  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Customer name and at least one item are required.' });
    return;
  }

  // Validate payment method
  const validPaymentMethods: PaymentMethod[] = ['telebirr', 'cbebirr', 'cbe', 'cash'];
  const selectedPaymentMethod: PaymentMethod = validPaymentMethods.includes(payment_method)
    ? payment_method
    : 'telebirr';

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

    // 2. Determine initial payment status
    const initialPaymentStatus: PaymentStatus = payment_reference && payment_reference.trim().length > 0
      ? 'pending_verification'
      : 'unpaid';

    const customerId = user?.role === 'customer' ? user.id : null;
    const createdBy = user ? user.id : null;

    // 3. Create the Order
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const orderRes = await client.query(
      `INSERT INTO orders (
        order_number, 
        customer_name, 
        customer_email, 
        customer_id, 
        status, 
        payment_method, 
        payment_reference, 
        payment_status, 
        total_amount, 
        created_by
       )
       VALUES ($1, $2, $3, $4, 'new', $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orderNumber,
        customer_name,
        customer_email || (user?.role === 'customer' ? user.email : ''),
        customerId,
        selectedPaymentMethod,
        payment_reference ? payment_reference.trim() : null,
        initialPaymentStatus,
        calculatedTotal,
        createdBy,
      ]
    );

    const createdOrder = orderRes.rows[0];

    // 4. Insert order items
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

/**
 * Staff & Admin Endpoint: Verify or Reject customer payment reference
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, notes } = req.body; // action: 'verify' | 'reject'
  const staffUserId = req.user?.id;

  if (!['verify', 'reject'].includes(action)) {
    res.status(400).json({ error: 'Invalid action. Must be "verify" or "reject".' });
    return;
  }

  try {
    const newPaymentStatus: PaymentStatus = action === 'verify' ? 'verified' : 'rejected';
    // If verified, automatically advance order status to 'paid'
    const newOrderStatusClause = action === 'verify' ? `, status = 'paid'` : ``;

    const result = await query(
      `UPDATE orders 
       SET payment_status = $1,
           verified_by = $2,
           verified_at = CURRENT_TIMESTAMP,
           verification_notes = $3
           ${newOrderStatusClause},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [newPaymentStatus, staffUserId || null, notes || null, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({
      success: true,
      message: action === 'verify' ? 'Payment reference verified and marked Paid' : 'Payment reference rejected',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update payment verification', details: error.message });
  }
};

/**
 * Customer Endpoint: Submit or update payment transaction reference
 */
export const submitPaymentReference = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { payment_method, payment_reference } = req.body;
  const user = req.user;

  if (!payment_reference || payment_reference.trim().length === 0) {
    res.status(400).json({ error: 'Payment reference number is required.' });
    return;
  }

  try {
    // If user is a customer, ensure this order belongs to them
    const checkSql = user?.role === 'customer'
      ? 'SELECT * FROM orders WHERE id = $1 AND customer_id = $2'
      : 'SELECT * FROM orders WHERE id = $1';
    const checkParams = user?.role === 'customer' ? [id, user.id] : [id];

    const existing = await query(checkSql, checkParams);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Order not found or unauthorized' });
      return;
    }

    const result = await query(
      `UPDATE orders 
       SET payment_method = COALESCE($1, payment_method),
           payment_reference = $2,
           payment_status = 'pending_verification',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [payment_method || null, payment_reference.trim(), id]
    );

    res.json({
      success: true,
      message: 'Payment reference submitted. Awaiting staff verification.',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit payment reference', details: error.message });
  }
};
