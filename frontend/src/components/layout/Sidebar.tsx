import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  // Navigation items based on role
  const navItems = isCustomer
    ? [
        { label: 'Shop Catalog', path: '/products', icon: ShoppingBag },
        { label: 'My Orders', path: '/orders', icon: ShoppingCart },
      ]
    : [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Products & Inventory', path: '/products', icon: Package },
        { label: 'Orders & Payments', path: '/orders', icon: ShoppingCart },
      ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64">
      {/* Mobile drawer header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            S
          </div>
          <span className="font-extrabold text-base text-white tracking-tight">StockFlow</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-1 flex-1 overflow-y-auto">
        <p className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          {isCustomer ? 'Customer Portal' : 'Main Navigation'}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 border border-slate-700/50">
          <p className="font-semibold text-slate-300">
            {isCustomer ? 'Payment Methods' : 'Quick Helper'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">
            {isCustomer
              ? 'Pay via Telebirr, CBEBirr, or CBE Bank Transfer and submit your reference code.'
              : 'Staff verifies customer Telebirr/CBE references before marking orders Paid.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Collapsible with backdrop) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Sliding panel */}
          <div className="relative z-10 flex-shrink-0 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
