import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { toast } from 'react-hot-toast';
import { logger } from '@/services/logger';

export default function PinLogin() {
  const navigate = useNavigate();
  const { loginWithPin } = useAuth();
  
  const [pin, setPin] = useState('');
  const [restaurantId] = useState(
    import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = useCallback(async (pinValue?: string) => {
    const pinToSubmit = pinValue || pin;
    
    if (pinToSubmit.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    
    try {
      await loginWithPin(pinToSubmit, restaurantId);
      toast.success('PIN login successful!');
      logger.info('User logged in with PIN');
      
      // Redirect to server view (default for PIN users)
      navigate('/server');
    } catch (error: any) {
      logger.error('PIN login failed:', error);
      toast.error(error.message || 'Invalid PIN. Please try again.');
      setPin(''); // Clear PIN on error
    } finally {
      setIsLoading(false);
    }
  }, [pin, loginWithPin, restaurantId, navigate]);

  const handlePinInput = useCallback((digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      // Auto-submit when PIN reaches 4-6 digits (configurable)
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  }, [pin, handleSubmit]);

  const handleBackspace = useCallback(() => {
    setPin(pin.slice(0, -1));
  }, [pin]);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isLoading) return;
      
      if (e.key >= '0' && e.key <= '9') {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin, isLoading, handlePinInput, handleBackspace, handleSubmit]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Staff PIN Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your 4-6 digit PIN
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex space-x-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className={`w-12 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold
                      ${index < pin.length ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}
                      ${index === pin.length ? 'border-orange-300' : ''}
                    `}
                  >
                    {showPin && pin[index] ? pin[index] : pin[index] ? '•' : ''}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="absolute -right-10 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinInput(digit.toString())}
                disabled={isLoading || pin.length >= 6}
                className="py-4 px-4 text-2xl font-semibold rounded-lg bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {digit}
              </button>
            ))}
            
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || pin.length === 0}
              className="py-4 px-4 text-lg font-semibold rounded-lg bg-gray-100 border-2 border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
            
            <button
              type="button"
              onClick={() => handlePinInput('0')}
              disabled={isLoading || pin.length >= 6}
              className="py-4 px-4 text-2xl font-semibold rounded-lg bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              0
            </button>
            
            <button
              type="button"
              onClick={handleBackspace}
              disabled={isLoading || pin.length === 0}
              className="py-4 px-4 text-lg font-semibold rounded-lg bg-gray-100 border-2 border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading || pin.length < 4}
              className="w-full max-w-xs py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </div>

          {/* Alternative Login Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Manager Login
              </Link>
              
              <Link
                to="/station-login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Station Login
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}