import { Request, Response } from 'express';
import { query } from '../config/db';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const { search, category, lowStockOnly } = req.query;

  try {
    let sql = `SELECT * FROM products WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (lowStockOnly === 'true') {
      sql += ` AND stock <= low_stock_threshold`;
    }

    sql += ` ORDER BY stock ASC, id DESC`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve products', details: error.message });
  }
};

export const getLowStockProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT * FROM products WHERE stock <= low_stock_threshold ORDER BY stock ASC`
    );
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve low-stock products', details: error.message });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve product', details: error.message });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const { name, sku, category, price, stock, low_stock_threshold, description } = req.body;

  if (!name || !sku || price === undefined || stock === undefined) {
    res.status(400).json({ error: 'name, sku, price, and stock are required fields.' });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO products (name, sku, category, price, stock, low_stock_threshold, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        sku.toUpperCase().trim(),
        category || 'General',
        parseFloat(price),
        parseInt(stock, 10),
        low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 10,
        description || '',
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Product with this SKU already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, sku, category, price, stock, low_stock_threshold, description } = req.body;

  try {
    const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const current = existing.rows[0];
    const updatedName = name ?? current.name;
    const updatedSku = sku ? sku.toUpperCase().trim() : current.sku;
    const updatedCategory = category ?? current.category;
    const updatedPrice = price !== undefined ? parseFloat(price) : current.price;
    const updatedStock = stock !== undefined ? parseInt(stock, 10) : current.stock;
    const updatedThreshold =
      low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : current.low_stock_threshold;
    const updatedDesc = description ?? current.description;

    const result = await query(
      `UPDATE products 
       SET name = $1, sku = $2, category = $3, price = $4, stock = $5, low_stock_threshold = $6, description = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [updatedName, updatedSku, updatedCategory, updatedPrice, updatedStock, updatedThreshold, updatedDesc, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Another product already has this SKU.' });
      return;
    }
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ success: true, message: 'Product deleted successfully', id });
  } catch (error: any) {
    if (error.code === '23503') {
      res.status(400).json({
        error: 'Cannot delete product because it is referenced in existing orders. Consider updating stock to 0 instead.',
      });
      return;
    }
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
};

