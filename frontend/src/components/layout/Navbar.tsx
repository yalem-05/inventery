import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User as UserIcon, Shield, Menu, X } from 'lucide-react';

interface NavbarProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ sidebarOpen, onToggleSidebar }) => {
  const { user, logout } = useAuth();

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

      <div className="flex items-center space-x-2 sm:space-x-4">
        {user && (
          <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-50 border border-slate-200/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
              <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left text-xs">
              <p className="font-bold text-slate-800 leading-tight max-w-[90px] sm:max-w-none truncate">
                {user.name}
              </p>
              <div className="flex items-center space-x-1 text-slate-500">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span className="capitalize font-medium text-[10px] sm:text-[11px]">{user.role}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors border border-transparent hover:border-rose-100"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
