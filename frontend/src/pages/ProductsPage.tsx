import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  ShoppingBag,
  Download,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { isAdmin, isCustomer } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Electronics',
    price: '',
    stock: '',
    low_stock_threshold: '10',
    description: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [filterLowStock]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = filterLowStock ? '/products/low-stock' : '/products';
      const res = await api.get(url);
      setProducts(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Electronics',
      price: '',
      stock: '',
      low_stock_threshold: '10',
      description: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      description: product.description || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) return;

    const headers = ['Product Name', 'SKU', 'Category', 'Price ($)', 'Current Stock', 'Low Stock Threshold'];
    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      Number(p.price).toFixed(2),
      p.stock,
      p.low_stock_threshold,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {isCustomer ? 'Products Store Catalog' : 'Inventory & Products'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            {isCustomer
              ? 'Browse genuine in-stock items and pay via Telebirr, CBEBirr, or CBE Bank.'
              : 'Maintain stock levels, configure thresholds, and manage your catalog.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {!isCustomer && (
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all"
              title="Download CSV Catalog"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {!isCustomer && (
            <Button onClick={handleOpenCreateModal} variant="primary" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span>Add New Product</span>
            </Button>
          )}

          {isCustomer && (
            <Button onClick={() => navigate('/orders')} variant="primary" className="w-full sm:w-auto">
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span>Checkout Order</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {!isCustomer && (
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center space-x-2 transition-all ${
              filterLowStock
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Warning Only</span>
          </button>
        )}
      </div>

      {/* Products Content: Desktop Table + Mobile Card View */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading inventory items..." />
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-300 mb-2 sm:mb-3" />
            <p className="text-sm sm:text-base font-semibold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5">SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Price</th>
                    <th className="px-6 py-3.5">Stock Level</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.low_stock_threshold;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {p.name}
                          {p.description && (
                            <span className="block text-xs font-normal text-slate-400 truncate max-w-xs">
                              {p.description}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.sku}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-700 font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          ${Number(p.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">{p.stock}</span>
                            {p.stock <= 0 ? (
                              <Badge variant="danger">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge variant="warning">
                                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                                Low ({p.stock} left)
                              </Badge>
                            ) : (
                              <Badge variant="success">Available</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {isCustomer ? (
                            <button
                              onClick={() => navigate('/orders')}
                              disabled={p.stock <= 0}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1 ml-auto"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Order Now</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Edit product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete product (Admin only)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.low_stock_threshold;
                return (
                  <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.sku}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{p.category}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-slate-900 text-base">
                          ${Number(p.price).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500 font-medium">Stock:</span>
                        <span className="font-bold text-slate-900 text-sm">{p.stock}</span>
                        {p.stock <= 0 ? (
                          <Badge variant="danger" size="sm">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="warning" size="sm">
                            <AlertTriangle className="w-3 h-3 mr-0.5 inline" />
                            Low ({p.stock})
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">In Stock</Badge>
                        )}
                      </div>

                      {isCustomer ? (
                        <button
                          onClick={() => navigate('/orders')}
                          disabled={p.stock <= 0}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Order Now</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors text-xs flex items-center space-x-1"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-xs flex items-center space-x-1"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal for Staff & Admin */}
      {!isCustomer && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProduct ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          maxWidth="lg"
        >
          {modalError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
              {modalError}
            </div>
          )}

          <form onSubmit={handleSaveProduct} className="space-y-3.5">
            <Input
              label="Product Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Wireless Ergonomic Mouse"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="SKU Code"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-1001"
              />
              <Input
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Electronics, Office"
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
              <Input
                label="Price ($)"
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="29.99"
              />
              <Input
                label="Initial Stock"
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="50"
              />
              <Input
                label="Threshold"
                type="number"
                required
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                placeholder="10"
                helperText="Alert triggered below this"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Add product specifications or notes..."
              />
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
              <Button type="submit" variant="primary" isLoading={modalLoading}>
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
