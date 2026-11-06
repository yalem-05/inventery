import { Request } from 'express';

export type UserRole = 'admin' | 'staff';

export interface UserPayload {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'new' | 'paid' | 'delivered';

export interface OrderItem {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  status: OrderStatus;
  total_amount: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

