import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { toast } from 'react-hot-toast';
import { logger } from '@/services/logger';
import { motion } from 'framer-motion';
import { 
  Users, 
  ChefHat, 
  Package, 
  DollarSign, 
  Settings, 
  ShoppingCart,
  Lock,
  Mail,
  Hash
} from 'lucide-react';

interface DemoCredential {
  role: string;
  pin?: string;
  email?: string;
  password?: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  redirectTo: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    role: 'Server',
    pin: '2468',
    description: 'Take orders, manage tables',
    icon: <Users className="w-6 h-6" />,
    color: '#2A4B5C',
    redirectTo: '/server'
  },
  {
    role: 'Kitchen',
    pin: '1357',
    description: 'Prepare orders, update status',
    icon: <ChefHat className="w-6 h-6" />,
    color: '#FF6B35',
    redirectTo: '/kitchen'
  },
  {
    role: 'Expo',
    pin: '3691',
    description: 'Quality check, order dispatch',
    icon: <Package className="w-6 h-6" />,
    color: '#F4A460',
    redirectTo: '/expo'
  },
  {
    role: 'Cashier',
    pin: '4802',
    description: 'Process payments, handle checkout',
    icon: <DollarSign className="w-6 h-6" />,
    color: '#4ECDC4',
    redirectTo: '/checkout'
  },
  {
    role: 'Admin',
    email: 'admin@demo.com',
    password: 'demo123',
    description: 'Full system access',
    icon: <Settings className="w-6 h-6" />,
    color: '#88B0A4',
    redirectTo: '/admin'
  },
  {
    role: 'Customer',
    description: 'Self-service ordering (no login)',
    icon: <ShoppingCart className="w-6 h-6" />,
    color: '#7B68EE',
    redirectTo: '/kiosk'
  }
];

export default function SignInPage() {
  const navigate = useNavigate();
  const { login, loginWithPin, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<DemoCredential | null>(null);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoBox, setShowDemoBox] = useState(true);
  
  const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handlePinSubmit = useCallback(async (pinValue: string) => {
    if (pinValue.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPin(pinValue, restaurantId);
      const credential = DEMO_CREDENTIALS.find(c => c.pin === pinValue);
      toast.success(`Welcome, ${credential?.role || 'Staff'}!`);
      navigate(credential?.redirectTo || '/server');
    } catch (error: any) {
      logger.error('PIN login failed:', error);
      toast.error('Invalid PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  }, [loginWithPin, restaurantId, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, restaurantId);
      toast.success('Welcome back, Admin!');
      navigate('/admin');
    } catch (error: any) {
      logger.error('Email login failed:', error);
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when PIN reaches 4 digits
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handleQuickAccess = (credential: DemoCredential) => {
    if (credential.role === 'Customer') {
      // Customer doesn't need login
      navigate(credential.redirectTo);
    } else if (credential.pin) {
      // Auto-fill and submit PIN
      setSelectedRole(credential);
      setPin(credential.pin);
      handlePinSubmit(credential.pin);
    } else if (credential.email && credential.password) {
      // Auto-fill email/password
      setSelectedRole(credential);
      setEmail(credential.email);
      setPassword(credential.password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/transparent.png"
                alt="Restaurant OS"
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Restaurant OS</h1>
                <p className="text-sm text-gray-500">Sign in to your workspace</p>
              </div>
            </div>
            <button
              onClick={() => setShowDemoBox(!showDemoBox)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showDemoBox ? 'Hide' : 'Show'} Demo Credentials
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Demo Credentials Box */}
          {showDemoBox && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  🎯 Quick Demo Access
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Click any role below to auto-fill credentials
                </p>
                <div className="space-y-3">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <motion.button
                      key={cred.role}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickAccess(cred)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                      style={{ borderLeftWidth: 4, borderLeftColor: cred.color }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5" style={{ color: cred.color }}>
                          {cred.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{cred.role}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{cred.description}</p>
                          {cred.pin && (
                            <div className="flex items-center mt-1 space-x-1">
                              <Hash className="w-3 h-3 text-gray-400" />
                              <span className="text-sm font-mono text-blue-600">{cred.pin}</span>
                            </div>
                          )}
                          {cred.email && (
                            <div className="flex items-center mt-1 space-x-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-600">{cred.email}</span>
                            </div>
                          )}
                          {cred.role === 'Customer' && (
                            <span className="text-xs text-green-600 font-medium">No login required</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Login Forms */}
          <div className={`${showDemoBox ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Login Type Selector */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setSelectedRole(null)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    !selectedRole || selectedRole.pin
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Hash className="w-5 h-5 inline mr-2" />
                  PIN Login
                </button>
                <button
                  onClick={() => setSelectedRole(DEMO_CREDENTIALS.find(c => c.email) || null)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                    selectedRole?.email
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="w-5 h-5 inline mr-2" />
                  Email Login
                </button>
              </div>

              {/* PIN Login Form */}
              {(!selectedRole || selectedRole.pin) && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff PIN Login</h2>
                    <p className="text-gray-600">Enter your 4-digit PIN</p>
                  </div>

                  {/* PIN Display */}
                  <div className="flex justify-center">
                    <div className="flex space-x-2">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`w-14 h-16 border-2 rounded-lg flex items-center justify-center text-2xl font-bold
                            ${index < pin.length ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                          `}
                        >
                          {pin[index] ? '•' : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PIN Pad */}
                  <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handlePinInput(digit.toString())}
                        disabled={isLoading || pin.length >= 4}
                        className="py-4 text-xl font-semibold rounded-lg bg-gray-50 border-2 border-gray-200 hover:bg-gray-100 hover:border-blue-400 disabled:opacity-50 transition-all"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPin('')}
                      disabled={isLoading || pin.length === 0}
                      className="py-4 text-lg font-medium rounded-lg bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 disabled:opacity-50 transition-all"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinInput('0')}
                      disabled={isLoading || pin.length >= 4}
                      className="py-4 text-xl font-semibold rounded-lg bg-gray-50 border-2 border-gray-200 hover:bg-gray-100 hover:border-blue-400 disabled:opacity-50 transition-all"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setPin(pin.slice(0, -1))}
                      disabled={isLoading || pin.length === 0}
                      className="py-4 text-lg font-medium rounded-lg bg-gray-50 border-2 border-gray-200 hover:bg-gray-100 disabled:opacity-50 transition-all"
                    >
                      ←
                    </button>
                  </div>
                </div>
              )}

              {/* Email Login Form */}
              {selectedRole?.email && (
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Manager Login</h2>
                    <p className="text-gray-600">Sign in with your email and password</p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin@demo.com"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}