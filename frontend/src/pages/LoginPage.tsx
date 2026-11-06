import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Package2, AlertCircle, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await register(name, email, password);
        navigate('/products'); // Redirect customer directly to catalog to order
      } else {
        await login(email, password);
        // If customer, go to store/products, if admin/staff go to dashboard
        const storedUser = localStorage.getItem('user');
        const role = storedUser ? JSON.parse(storedUser).role : '';
        if (role === 'customer') {
          navigate('/products');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (isRegisterMode
            ? 'Failed to register account. Please try again.'
            : 'Failed to authenticate. Please check your credentials.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const autofillCredentials = (userEmail: string, userPass: string) => {
    setIsRegisterMode(false);
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white shadow-md mb-2.5 sm:mb-3">
          <Package2 className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">StockFlow</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          Order & Inventory Management with Ethiopian Payments
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-xl shadow-slate-200/60 rounded-xl sm:rounded-2xl border border-slate-200/70">
          {/* Sign In vs Register Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center space-x-1.5 ${
                !isRegisterMode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff & Admin Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center space-x-1.5 ${
                isRegisterMode
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Customer Sign Up</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {isRegisterMode && (
              <div>
                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Abebe Kebede"
                />
              </div>
            )}

            <div>
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@business.com"
                autoComplete="email"
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
              <span>{isRegisterMode ? 'Create Customer Account & Shop' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill Helper */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Test Credentials (3 Roles)
            </p>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => autofillCredentials('admin@business.com', 'admin123')}
                className="p-2 text-left border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-xs"
              >
                <div className="font-semibold text-slate-800">Admin</div>
                <div className="text-[10px] text-slate-500">Full Access</div>
              </button>

              <button
                type="button"
                onClick={() => autofillCredentials('staff@business.com', 'staff123')}
                className="p-2 text-left border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-xs"
              >
                <div className="font-semibold text-slate-800">Staff</div>
                <div className="text-[10px] text-slate-500">Verify Payments</div>
              </button>

              <button
                type="button"
                onClick={() => autofillCredentials('customer@business.com', 'customer123')}
                className="p-2 text-left border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-xs"
              >
                <div className="font-semibold text-slate-800">Customer</div>
                <div className="text-[10px] text-slate-500">Order & Telebirr</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
