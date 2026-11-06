import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Order, OrderStatus, PaymentMethod, PaymentStatus, Product } from '../types';
import { useAuth } from '../hooks/useAuth';
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
  FileText,
  Printer,
  Download,
  CheckCheck,
  XCircle,
  Copy,
  Check,
  Smartphone,
  Building2,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { user, isCustomer } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus | PaymentStatus>('all');

  // Modal State for New Order
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [paymentReference, setPaymentReference] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ product_id: number; quantity: number }>>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Verification Modal State for Staff/Admin
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Customer Reference Submission Modal
  const [referenceSubmitOrder, setReferenceSubmitOrder] = useState<Order | null>(null);
  const [submittingRefNumber, setSubmittingRefNumber] = useState('');
  const [submittingMethod, setSubmittingMethod] = useState<PaymentMethod>('telebirr');

  // Invoice Modal State
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

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
    setCustomerName(user?.name || '');
    setCustomerEmail(user?.email || '');
    setPaymentMethod('telebirr');
    setPaymentReference('');
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
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        items: orderItems,
      });

      setIsModalOpen(false);
      fetchOrders();
      fetchProducts();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      if (invoiceOrder && invoiceOrder.id === orderId) {
        setInvoiceOrder({ ...invoiceOrder, status: newStatus });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update order status');
    }
  };

  // Staff Payment Verification Handler
  const handleVerifyPayment = async (action: 'verify' | 'reject') => {
    if (!verifyingOrder) return;
    setVerificationLoading(true);

    try {
      const res = await api.patch(`/orders/${verifyingOrder.id}/verify-payment`, {
        action,
        notes: verificationNotes,
      });

      setOrders(orders.map((o) => (o.id === verifyingOrder.id ? { ...o, ...res.data.data } : o)));
      setVerifyingOrder(null);
      setVerificationNotes('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to verify payment');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Customer Payment Reference Submission Handler
  const handleSubmitReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceSubmitOrder) return;

    try {
      const res = await api.patch(`/orders/${referenceSubmitOrder.id}/submit-payment`, {
        payment_method: submittingMethod,
        payment_reference: submittingRefNumber,
      });

      setOrders(orders.map((o) => (o.id === referenceSubmitOrder.id ? { ...o, ...res.data.data } : o)));
      setReferenceSubmitOrder(null);
      setSubmittingRefNumber('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit payment reference');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Customer Email',
      'Status',
      'Payment Method',
      'Payment Reference',
      'Payment Status',
      'Total Amount ($)',
    ];
    const rows = orders.map((o) => [
      `"${o.order_number}"`,
      `"${new Date(o.created_at).toISOString().split('T')[0]}"`,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"${(o.customer_email || '').replace(/"/g, '""')}"`,
      `"${o.status.toUpperCase()}"`,
      `"${(o.payment_method || 'telebirr').toUpperCase()}"`,
      `"${(o.payment_reference || 'N/A').replace(/"/g, '""')}"`,
      `"${(o.payment_status || 'unpaid').toUpperCase()}"`,
      Number(o.total_amount).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentMethodBadge = (method?: PaymentMethod) => {
    switch (method) {
      case 'telebirr':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Smartphone className="w-3 h-3 mr-1 text-amber-600" />
            Telebirr
          </span>
        );
      case 'cbebirr':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Smartphone className="w-3 h-3 mr-1 text-purple-600" />
            CBEBirr
          </span>
        );
      case 'cbe':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Building2 className="w-3 h-3 mr-1 text-blue-600" />
            CBE Bank
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            Cash
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status?: PaymentStatus) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="success" size="sm">
            <CheckCheck className="w-3 h-3 mr-1 inline text-emerald-600" />
            Verified
          </Badge>
        );
      case 'pending_verification':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1 inline text-amber-600" />
            Pending Verification
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm">
            <XCircle className="w-3 h-3 mr-1 inline text-rose-600" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            Unpaid
          </Badge>
        );
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

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    if (['new', 'paid', 'delivered'].includes(statusFilter)) {
      return o.status === statusFilter;
    }
    return o.payment_status === statusFilter;
  });

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
            {isCustomer ? 'My Orders & Payment Status' : 'Orders & Payment Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            {isCustomer
              ? 'Track orders, view Telebirr / CBE payment verification, and get invoices.'
              : 'Verify customer Telebirr/CBE payment references, advance order status, and export.'}
          </p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {!isCustomer && (
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all"
              title="Download CSV report"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}
          <Button onClick={handleOpenCreateOrder} variant="primary" className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            <span>{isCustomer ? 'Place New Order' : 'Create Order'}</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'new', label: 'New' },
          { id: 'paid', label: 'Paid' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'pending_verification', label: 'Pending Payment Verification' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading orders..." />
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-300 mb-2 sm:mb-3" />
            <p className="text-sm sm:text-base font-semibold text-slate-700">No orders found</p>
            <p className="text-xs text-slate-400 mt-1">
              {isCustomer
                ? 'You have not placed any orders yet. Click "Place New Order" to start shopping!'
                : 'No customer orders match the current filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Order #</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Payment Method</th>
                    <th className="px-5 py-3.5">Ref / Verification</th>
                    <th className="px-5 py-3.5">Total Amount</th>
                    <th className="px-5 py-3.5">Order Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        {o.order_number}
                        <span className="block text-[11px] font-sans font-normal text-slate-400">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{o.customer_name}</p>
                        {o.customer_email && (
                          <p className="text-xs text-slate-400">{o.customer_email}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">{getPaymentMethodBadge(o.payment_method)}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {o.payment_reference ? (
                            <div className="flex items-center space-x-1 font-mono text-xs font-bold text-slate-800">
                              <span>{o.payment_reference}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No ref submitted</span>
                          )}
                          <div>{getPaymentStatusBadge(o.payment_status)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        ${Number(o.total_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(o.status)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center space-x-2">
                          {/* Staff Verification Button */}
                          {!isCustomer && o.payment_status === 'pending_verification' && (
                            <button
                              onClick={() => {
                                setVerifyingOrder(o);
                                setVerificationNotes('');
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shadow-sm flex items-center space-x-1"
                              title="Verify Customer Payment"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                          )}

                          {/* Customer Reference Submit / Update button */}
                          {isCustomer && (o.payment_status === 'unpaid' || o.payment_status === 'rejected') && (
                            <button
                              onClick={() => {
                                setReferenceSubmitOrder(o);
                                setSubmittingRefNumber(o.payment_reference || '');
                                setSubmittingMethod(o.payment_method || 'telebirr');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                            >
                              Submit Ref
                            </button>
                          )}

                          {/* Invoice View */}
                          <button
                            onClick={() => setInvoiceOrder(o)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors text-xs flex items-center space-x-1"
                            title="View Printable Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          {/* Workflow status stepper for Staff/Admin */}
                          {!isCustomer && (
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                              <button
                                onClick={() => handleStatusChange(o.id, 'new')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                                  o.status === 'new'
                                    ? 'bg-sky-500 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                New
                              </button>
                              <button
                                onClick={() => handleStatusChange(o.id, 'paid')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                                  o.status === 'paid'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Paid
                              </button>
                              <button
                                onClick={() => handleStatusChange(o.id, 'delivered')}
                                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                                  o.status === 'delivered'
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Delivered
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filteredOrders.map((o) => (
                <div key={o.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{o.order_number}</span>
                        {getStatusBadge(o.status)}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{o.customer_name}</p>
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

                  {/* Payment Details Pill */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Payment Option:</span>
                      <div>{getPaymentMethodBadge(o.payment_method)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Reference Code:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {o.payment_reference || 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">Verification Status:</span>
                      <div>{getPaymentStatusBadge(o.payment_status)}</div>
                    </div>
                  </div>

                  {/* Action buttons on mobile */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setInvoiceOrder(o)}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Invoice</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {/* Staff Verify Action */}
                      {!isCustomer && o.payment_status === 'pending_verification' && (
                        <button
                          onClick={() => {
                            setVerifyingOrder(o);
                            setVerificationNotes('');
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg shadow-sm flex items-center space-x-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Verify Payment</span>
                        </button>
                      )}

                      {/* Customer Submit Reference */}
                      {isCustomer && (o.payment_status === 'unpaid' || o.payment_status === 'rejected') && (
                        <button
                          onClick={() => {
                            setReferenceSubmitOrder(o);
                            setSubmittingRefNumber(o.payment_reference || '');
                            setSubmittingMethod(o.payment_method || 'telebirr');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg shadow-sm"
                        >
                          Submit Reference
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Staff Order Status Stepper on Mobile */}
                  {!isCustomer && (
                    <div className="pt-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Order Lifecycle Status:
                      </p>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-center">
                        <button
                          onClick={() => handleStatusChange(o.id, 'new')}
                          className={`py-1 text-xs font-semibold rounded-md ${
                            o.status === 'new' ? 'bg-sky-500 text-white' : 'text-slate-600'
                          }`}
                        >
                          New
                        </button>
                        <button
                          onClick={() => handleStatusChange(o.id, 'paid')}
                          className={`py-1 text-xs font-semibold rounded-md ${
                            o.status === 'paid' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Paid
                        </button>
                        <button
                          onClick={() => handleStatusChange(o.id, 'delivered')}
                          className={`py-1 text-xs font-semibold rounded-md ${
                            o.status === 'delivered' ? 'bg-slate-800 text-white' : 'text-slate-600'
                          }`}
                        >
                          Delivered
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Staff Payment Verification Dialog Modal */}
      {verifyingOrder && (
        <Modal
          isOpen={!!verifyingOrder}
          onClose={() => setVerifyingOrder(null)}
          title="Verify Customer Payment"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Order Number:</span>
                <span className="font-mono font-bold text-slate-900">{verifyingOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-semibold text-slate-800">{verifyingOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Order Total:</span>
                <span className="font-extrabold text-sm text-emerald-700">
                  ${Number(verifyingOrder.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Payment Method:</span>
                <div>{getPaymentMethodBadge(verifyingOrder.payment_method)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Submitted Reference:</span>
                <span className="font-mono font-extrabold text-sm text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {verifyingOrder.payment_reference || 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Verification Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="e.g. Confirmed with Telebirr SMS notification..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleVerifyPayment('reject')}
                disabled={verificationLoading}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors"
              >
                Reject Reference
              </button>
              <Button
                onClick={() => handleVerifyPayment('verify')}
                variant="primary"
                isLoading={verificationLoading}
                className="text-xs"
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                <span>Confirm & Mark Paid</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Reference Submission Modal */}
      {referenceSubmitOrder && (
        <Modal
          isOpen={!!referenceSubmitOrder}
          onClose={() => setReferenceSubmitOrder(null)}
          title="Submit Payment Reference"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitReference} className="space-y-4">
            <p className="text-xs text-slate-500">
              Please send{' '}
              <strong className="text-slate-800">
                ${Number(referenceSubmitOrder.total_amount).toFixed(2)}
              </strong>{' '}
              using one of our official Ethiopian accounts below, then enter your transaction reference ID.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Payment Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'telebirr', name: 'Telebirr', num: '0911-234567' },
                  { id: 'cbebirr', name: 'CBEBirr', num: '0922-345678' },
                  { id: 'cbe', name: 'CBE Bank', num: '1000-1234-5678' },
                ].map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSubmittingMethod(channel.id as any)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      submittingMethod === channel.id
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">{channel.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{channel.num}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="Transaction Reference Number"
                required
                value={submittingRefNumber}
                onChange={(e) => setSubmittingRefNumber(e.target.value)}
                placeholder="e.g. TB982348123 or FT240182..."
                helperText="Enter the reference code received in your confirmation SMS"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setReferenceSubmitOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Submit for Verification
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Invoice Modal */}
      {invoiceOrder && (
        <Modal
          isOpen={!!invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
          title="Customer Order Invoice"
          maxWidth="lg"
        >
          <div className="space-y-6 text-slate-800 print:text-black">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    S
                  </div>
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                    StockFlow Inc.
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Official Sales Invoice & Delivery Note</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="font-mono font-extrabold text-base text-slate-900">
                  {invoiceOrder.order_number}
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Date: {new Date(invoiceOrder.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Customer, Payment & Status Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <p className="font-semibold text-slate-400 uppercase tracking-wider mb-1">Billed To:</p>
                <p className="font-bold text-slate-900 text-sm">{invoiceOrder.customer_name}</p>
                {invoiceOrder.customer_email && (
                  <p className="text-slate-500 mt-0.5">{invoiceOrder.customer_email}</p>
                )}
              </div>
              <div className="sm:text-right space-y-1">
                <p className="font-semibold text-slate-400 uppercase tracking-wider">Payment Details:</p>
                <div className="flex sm:justify-end items-center space-x-1.5">
                  {getPaymentMethodBadge(invoiceOrder.payment_method)}
                  {getPaymentStatusBadge(invoiceOrder.payment_status)}
                </div>
                {invoiceOrder.payment_reference && (
                  <p className="font-mono text-[11px] text-slate-600">
                    Ref: <span className="font-bold">{invoiceOrder.payment_reference}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 uppercase tracking-wider text-slate-500 font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceOrder.items && invoiceOrder.items.length > 0 ? (
                    invoiceOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.product_name || `Product #${item.product_id}`}
                          {item.sku && (
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              SKU: {item.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ${Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ${Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No item breakdown available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-4 bg-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Grand Total Due / Settled</p>
                <p className="text-[10px] text-slate-400">All local taxes included</p>
              </div>
              <div className="font-extrabold text-xl text-slate-900">
                ${Number(invoiceOrder.total_amount).toFixed(2)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close Preview
              </button>
              <Button onClick={() => window.print()} variant="primary" size="sm">
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print Receipt</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Order Modal with Ethiopian Payment Options */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isCustomer ? 'Complete Your Order & Payment' : 'Create Customer Order'}
        maxWidth="lg"
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Recipient Name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Abebe Bikila"
            />
            <Input
              label="Recipient Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@domain.com"
            />
          </div>

          {/* Items Selector */}
          <div className="pt-1">
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

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
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
                      <input
                        type="number"
                        min="1"
                        max={selectedProd ? selectedProd.stock : 999}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full xs:w-16 bg-white border border-slate-300 rounded-md py-1.5 px-2 text-xs font-medium text-slate-800 text-center"
                        placeholder="Qty"
                      />
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
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

          {/* Payment Method Cards (Telebirr, CBEBirr, CBE Bank Transfer) */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Select Ethiopian Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Telebirr Card */}
              <div
                onClick={() => setPaymentMethod('telebirr')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'telebirr'
                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900">Telebirr</span>
                  <Smartphone className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Merchant Phone:</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-xs text-slate-900">0911-23-45-67</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard('0911234567', 'telebirr');
                    }}
                    className="text-[10px] text-amber-700 hover:underline"
                  >
                    {copiedAccount === 'telebirr' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* CBEBirr Card */}
              <div
                onClick={() => setPaymentMethod('cbebirr')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cbebirr'
                    ? 'border-purple-500 bg-purple-50/70 ring-1 ring-purple-500 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-900">CBEBirr</span>
                  <Smartphone className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Shortcode / Phone:</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-xs text-slate-900">0922-34-56-78</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard('0922345678', 'cbebirr');
                    }}
                    className="text-[10px] text-purple-700 hover:underline"
                  >
                    {copiedAccount === 'cbebirr' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* CBE Bank Transfer Card */}
              <div
                onClick={() => setPaymentMethod('cbe')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cbe'
                    ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900">CBE Bank</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">CBE Account No:</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-xs text-slate-900">1000-1234-5678</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard('100012345678', 'cbe');
                    }}
                    className="text-[10px] text-blue-700 hover:underline"
                  >
                    {copiedAccount === 'cbe' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Reference Input */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-1.5">
            <Input
              label="Payment Transaction Reference ID"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. TB982348123 or FT240182..."
              helperText="Submit the SMS transaction code after transferring to verify your order"
            />
          </div>

          {/* Total Calculation summary */}
          <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-700">Order Total Amount:</span>
            <span className="font-bold text-base sm:text-lg text-slate-900">
              ${estimatedTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={modalLoading} disabled={products.length === 0}>
              <span>Confirm & Place Order</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
