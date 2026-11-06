export type UserRole = 'admin' | 'staff' | 'customer';

export type PaymentMethod = 'telebirr' | 'cbebirr' | 'cbe' | 'cash';
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'verified' | 'rejected';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number | string;
  stock: number;
  low_stock_threshold: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export type OrderStatus = 'new' | 'paid' | 'delivered';

export interface OrderItem {
  id?: number;
  product_id: number;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_id?: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_reference?: string;
  payment_status: PaymentStatus;
  verified_by?: number;
  verified_by_name?: string;
  verified_at?: string;
  verification_notes?: string;
  total_amount: number | string;
  created_by_name?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface DashboardMetrics {
  total_revenue: string | number;
  total_orders: string | number;
  total_products: string | number;
  low_stock_count: string | number;
}

export interface DailySale {
  date: string;
  total_sales: string | number;
  orders_count: number;
}

export interface TopProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  units_sold: number;
  total_revenue: string | number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  salesPerDay: DailySale[];
  topProducts: TopProduct[];
  lowStockAlerts: Product[];
}
