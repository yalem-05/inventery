import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { DashboardData } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'sales' | 'products'>('sales');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating real-time analytics..." />;
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        <p className="font-semibold">Unable to load dashboard</p>
        <p className="text-xs sm:text-sm mt-1">{error}</p>
      </div>
    );
  }

  const { metrics, salesPerDay, topProducts, lowStockAlerts } = data;

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${Number(metrics.total_revenue || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: 'Gross sales',
    },
    {
      title: 'Total Orders',
      value: metrics.total_orders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: 'Lifetime volume',
    },
    {
      title: 'Catalog Items',
      value: metrics.total_products,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: 'Active inventory',
    },
    {
      title: 'Low Stock Alerts',
      value: metrics.low_stock_count,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      change: Number(metrics.low_stock_count) > 0 ? 'Requires attention' : 'Healthy stock',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Real-time business performance, revenue analytics, and stock health.
          </p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Link
            to="/orders"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                  {stat.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Low-Stock Warning Banner if any items are low */}
      {lowStockAlerts && lowStockAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 text-xs sm:text-sm">
                  Low Stock Warning ({lowStockAlerts.length} item{lowStockAlerts.length > 1 ? 's' : ''})
                </h4>
                <p className="text-[11px] sm:text-xs text-amber-700 mt-0.5">
                  Items below threshold requiring replenishment.
                </p>
              </div>
            </div>
            <Link
              to="/products"
              className="text-xs font-semibold text-amber-900 hover:text-amber-800 flex items-center space-x-1 underline self-start sm:self-auto"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            {lowStockAlerts.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white/80 border border-amber-200/70 p-3 rounded-lg flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">SKU: {item.sku}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant="danger">{item.stock} left</Badge>
                  <p className="text-[10px] text-slate-400 mt-0.5">Min: {item.low_stock_threshold}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chart Section: Sales Per Day & Top Products (Unified Interactive Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Unified Interactive Chart Card */}
        <div className="lg:col-span-2">
          <Card
            title={chartTab === 'sales' ? 'Daily Sales Performance' : 'Top Products by Revenue'}
            subtitle={
              chartTab === 'sales'
                ? 'Sales revenue recorded across recent dates'
                : 'Highest generating catalog products'
            }
            action={
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setChartTab('sales')}
                  className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all ${
                    chartTab === 'sales'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sales per Day ($)
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('products')}
                  className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all ${
                    chartTab === 'products'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Top Products Chart
                </button>
              </div>
            }
          >
            <div className="h-60 sm:h-72 w-full pt-2 sm:pt-4">
              {chartTab === 'sales' ? (
                salesPerDay && salesPerDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                      />
                      <Bar dataKey="total_sales" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm">
                    <TrendingUp className="w-8 h-8 mb-2 stroke-slate-300" />
                    <span>No recorded sales in this period yet.</span>
                  </div>
                )
              ) : topProducts && topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => (val.length > 8 ? `${val.substring(0, 7)}...` : val)}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Total Revenue']}
                      labelFormatter={(label) => `Product: ${label}`}
                    />
                    <Bar dataKey="total_revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs sm:text-sm">
                  <Package className="w-8 h-8 mb-2 stroke-slate-300" />
                  <span>No product analytics available yet.</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Top Products Breakdown List */}
        <div>
          <Card
            title="Top Products"
            subtitle="Best performing by units & revenue"
            action={
              <Link to="/products" className="text-xs font-semibold text-emerald-600 hover:underline">
                View All
              </Link>
            }
          >
            <div className="space-y-3 pt-1">
              {topProducts && topProducts.length > 0 ? (
                topProducts.map((prod, index) => (
                  <div key={prod.id} className="flex items-center justify-between text-xs sm:text-sm pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{prod.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400">{prod.units_sold} units sold</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900">${Number(prod.total_revenue).toFixed(2)}</p>
                      <span className="text-[10px] text-slate-400">Stock: {prod.stock}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No product sales data yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
