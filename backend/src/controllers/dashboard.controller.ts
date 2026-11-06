import { Request, Response } from 'express';
import { query } from '../config/db';

export const getDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Overall Metrics
    const metricsResult = await query(`
      SELECT 
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled') AS total_revenue,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COUNT(*) FROM products WHERE stock <= low_stock_threshold) AS low_stock_count
    `);

    // 2. Sales per Day (Recent 7 days grouped by date)
    const salesPerDayResult = await query(`
      SELECT 
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(total_amount), 0)::numeric(10,2) AS total_sales,
        COUNT(id)::int AS orders_count
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // 3. Top Products by Quantity Sold and Revenue
    const topProductsResult = await query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock,
        COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
        COALESCE(SUM(oi.subtotal), 0)::numeric(10,2) AS total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, p.name, p.sku, p.stock
      ORDER BY units_sold DESC, total_revenue DESC
      LIMIT 5
    `);

    // 4. Low stock items (immediate alert feed)
    const lowStockAlerts = await query(`
      SELECT id, name, sku, stock, low_stock_threshold, price
      FROM products
      WHERE stock <= low_stock_threshold
      ORDER BY stock ASC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        metrics: metricsResult.rows[0],
        salesPerDay: salesPerDayResult.rows,
        topProducts: topProductsResult.rows,
        lowStockAlerts: lowStockAlerts.rows,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve dashboard analytics', details: error.message });
  }
};

