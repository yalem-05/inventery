import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Shield,
  ShoppingBag,
  ChevronDown,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const ProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';
  const isCustomer = user.role === 'customer';
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  const avatarGradient = isAdmin
    ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
    : isStaff
    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
    : 'bg-gradient-to-br from-amber-500 to-orange-600';

  const handleOpenProfileModal = () => {
    setIsOpen(false);
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all text-left ${
            isOpen
              ? 'bg-slate-100/80 border-slate-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {/* Avatar with dynamic role color */}
          <div className="relative">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-sm ${avatarGradient}`}
            >
              {userInitial}
            </div>
            {/* Online indicator dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          {/* User Details Preview */}
          <div className="hidden xs:block text-left">
            <p className="font-bold text-xs text-slate-800 leading-tight max-w-[120px] sm:max-w-[150px] truncate">
              {user.name}
            </p>
            <div className="flex items-center space-x-1 mt-0.5">
              {isAdmin && <ShieldCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
              {isStaff && <Shield className="w-3 h-3 text-blue-600 flex-shrink-0" />}
              {isCustomer && <ShoppingBag className="w-3 h-3 text-amber-600 flex-shrink-0" />}
              <span className="capitalize text-[10px] font-semibold text-slate-500">
                {user.role}
              </span>
            </div>
          </div>

          {/* Animated Chevron */}
          <ChevronDown
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu Flyout */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User Profile Header */}
            <div className="p-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
              <div className="flex items-start space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base text-white shadow-sm flex-shrink-0 ${avatarGradient}`}
                >
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{user.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-emerald-100 text-emerald-800'
                          : isStaff
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Status pill */}
              <div className="mt-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-700 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate">Active Authenticated Session</span>
              </div>
            </div>

            {/* Menu Options */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={handleOpenProfileModal}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span>Account Details</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <div className="px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-100 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Permissions Scope:</p>
                <p className="leading-relaxed">
                  {isAdmin
                    ? 'Full Administrator: inventory deletion, full analytics, payment verification.'
                    : isStaff
                    ? 'Staff Operations: order fulfillment, inventory management, verify Telebirr/CBE.'
                    : 'Customer Account: browse catalog, place orders, submit payment references.'}
                </p>
              </div>
            </div>

            {/* Logout Action */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-rose-100/70 text-rose-600">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Sign Out of Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Details Dialog Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="User Profile Details"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-sm flex-shrink-0 ${avatarGradient}`}
            >
              {userInitial}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{user.name}</h3>
              <p className="text-xs text-slate-500">{user.email}</p>
              <div className="mt-1">
                <Badge variant={isAdmin ? 'success' : isStaff ? 'info' : 'warning'}>
                  {isAdmin
                    ? 'System Administrator'
                    : isStaff
                    ? 'Operations Staff'
                    : 'Registered Customer'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Account ID</span>
              <span className="font-mono font-bold text-slate-800">#{user.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Assigned Role</span>
              <span className="capitalize font-semibold text-slate-800">{user.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Session Authorization</span>
              <span className="font-mono text-emerald-600 font-semibold">JWT Bearer Active</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Payment Verification Right</span>
              <span className={`font-semibold ${!isCustomer ? 'text-emerald-600' : 'text-slate-400'}`}>
                {!isCustomer ? 'Authorized (Staff/Admin)' : 'Not Applicable'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
