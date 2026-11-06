import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          S
        </div>
        <span className="font-extrabold text-lg text-slate-800 tracking-tight">StockFlow</span>
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
          v1.0
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-left text-xs">
              <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
              <div className="flex items-center space-x-1 text-slate-500">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span className="capitalize font-medium text-[11px]">{user.role}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-rose-100"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

