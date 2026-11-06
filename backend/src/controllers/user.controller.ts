import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../types';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY id ASC`
    );
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve users', details: error.message });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  const validRoles = ['admin', 'staff', 'customer'];
  const userRole = role && validRoles.includes(role) ? role : 'customer';

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, userRole]
    );

    res.status(201).json({
      success: true,
      message: `User created successfully with role '${userRole}'.`,
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
};

