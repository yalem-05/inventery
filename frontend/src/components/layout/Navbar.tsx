import React from 'react';
import { Menu, X } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';

interface NavbarProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ sidebarOpen, onToggleSidebar }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm/50">
      <div className="flex items-center space-x-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          S
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight">StockFlow</span>
          <span className="hidden xs:inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
            v1.0
          </span>
        </div>
      </div>

      {/* User Profile & Logout Dropdown */}
      <div className="flex items-center space-x-3">
        <ProfileDropdown />
      </div>
    </header>
  );
};
