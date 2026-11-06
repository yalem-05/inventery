import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Order, OrderStatus, Product } from '../types';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Plus,
  ShoppingCart,
  CheckCircle,
  Truck,
  Clock,
  Trash2,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  // Modal State for New Order
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderItems, setOrderItems] = useState<
    Array<{ product_id: number; quantity: number }>
  >([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleOpenCreateOrder = () => {
    setCustomerName('');
    setCustomerEmail('');
    setOrderItems([{ product_id: products[0]?.id || 0, quantity: 1 }]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setOrderItems([...orderItems, { product_id: products[0].id, quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'product_id' | 'quantity', value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: Number(value) };
    setOrderItems(updated);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      await api.post('/orders', {
        customer_name: customerName,
        customer_email: customerEmail,
        items: orderItems,
      });

      setIsModalOpen(false);
      fetchOrders();
      fetchProducts(); // Refresh products to reflect reduced stock!
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update order status');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return (
          <Badge variant="info" size="sm">
            <Clock className="w-3 h-3 mr-1 inline" />
            New
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle className="w-3 h-3 mr-1 inline" />
            Paid
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="neutral" size="sm">
            <Truck className="w-3 h-3 mr-1 inline" />
            Delivered
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  // Filter orders by selected status tab
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  // Calculate order preview total
  const estimatedTotal = orderItems.reduce((acc, item) => {
    const prod = products.find((p) => p.id === item.product_id);
    return acc + (prod ? Number(prod.price) * (item.quantity || 0) : 0);
  }, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Orders Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Create customer orders, adjust inventory levels automatically, and advance order workflow.
          </p>
        </div>
        <Button onClick={handleOpenCreateOrder} variant="primary" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span>Create Order</span>
        </Button>
      </div>

      {/* Status Filter Tabs (Mobile friendly segmented control) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(['all', 'new', 'paid', 'delivered'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-all ${
              statusFilter === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {tab === 'all' ? 'All Orders' : tab}
          </button>
        ))}
      </div>

      {/* Orders Content: Desktop Table + Mobile Card View */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading orders..." />
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-300 mb-2 sm:mb-3" />
            <p className="text-sm sm:text-base font-semibold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-400 mt-1">Create your first order to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Order #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Items Summary</th>
                    <th className="px-6 py-3.5">Total Amount</th>
                    <th className="px-6 py-3.5">Status Flow</th>
                    <th className="px-6 py-3.5 text-right">Update Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {o.order_number}
                        <span className="block text-[11px] font-sans font-normal text-slate-400">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{o.customer_name}</p>
                        {o.customer_email && (
                          <p className="text-xs text-slate-400">{o.customer_email}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          {o.items && o.items.length > 0 ? (
                            o.items.map((item, idx) => (
                              <div key={idx} className="text-slate-700">
                                <span className="font-semibold">{item.quantity}x</span>{' '}
                                <span>{item.product_name}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400">Standard items</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ${Number(o.total_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(o.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                          <button
                            onClick={() => handleStatusChange(o.id, 'new')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              o.status === 'new'
                                ? 'bg-sky-500 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            New
                          </button>
                          <button
                            onClick={() => handleStatusChange(o.id, 'paid')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              o.status === 'paid'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Paid
                          </button>
                          <button
                            onClick={() => handleStatusChange(o.id, 'delivered')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              o.status === 'delivered'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Delivered
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< 768px, optimized for < 500px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredOrders.map((o) => (
                <div key={o.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{o.order_number}</span>
                        {getStatusBadge(o.status)}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{o.customer_name}</p>
                      {o.customer_email && (
                        <p className="text-[11px] text-slate-400">{o.customer_email}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-slate-900 text-base">
                        ${Number(o.total_amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Items list */}
                  {o.items && o.items.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 space-y-1 border border-slate-100">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span>
                            <span className="font-semibold text-slate-800">{item.quantity}x</span>{' '}
                            {item.product_name}
                          </span>
                          <span className="font-mono text-slate-500">${Number(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mobile Status Flow Stepper Buttons */}
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Change Status:
                    </p>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => handleStatusChange(o.id, 'new')}
                        className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                          o.status === 'new'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        New
                      </button>
                      <button
                        onClick={() => handleStatusChange(o.id, 'paid')}
                        className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                          o.status === 'paid'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Paid
                      </button>
                      <button
                        onClick={() => handleStatusChange(o.id, 'delivered')}
                        className={`py-1.5 text-xs font-semibold rounded-md transition-all text-center ${
                          o.status === 'delivered'
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Delivered
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Order Modal (Mobile Responsive) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Customer Order"
        maxWidth="lg"
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Customer Name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. John Doe"
            />
            <Input
              label="Customer Email (Optional)"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          {/* Items Selector */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Order Items
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {orderItems.map((item, idx) => {
                const selectedProd = products.find((p) => p.id === item.product_id);
                return (
                  <div
                    key={idx}
                    className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                  >
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-md py-1.5 px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.name} - ${Number(p.price).toFixed(2)} ({p.stock} in stock)
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 flex-1 xs:flex-none">
                        <span className="text-[11px] text-slate-500 font-medium xs:hidden">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max={selectedProd ? selectedProd.stock : 999}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full xs:w-16 bg-white border border-slate-300 rounded-md py-1.5 px-2 text-xs font-medium text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Qty"
                        />
                      </div>

                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-slate-200/50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Calculation summary */}
          <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-700">Estimated Total:</span>
            <span className="font-bold text-base sm:text-lg text-slate-900">
              ${estimatedTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={modalLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={modalLoading}
              disabled={products.length === 0}
            >
              Confirm & Place Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
