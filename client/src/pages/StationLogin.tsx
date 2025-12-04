import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth.hooks';
import { toast } from 'react-hot-toast';
import { logger } from '@/services/logger';

type StationType = 'kitchen' | 'expo' | 'bar' | 'prep';

interface StationOption {
  type: StationType;
  label: string;
  description: string;
  icon: string;
  defaultRoute: string;
}

const STATION_OPTIONS: StationOption[] = [
  {
    type: 'kitchen',
    label: 'Kitchen Display',
    description: 'View and manage incoming orders',
    icon: '👨‍🍳',
    defaultRoute: '/kitchen'
  },
  {
    type: 'expo',
    label: 'Expo Station',
    description: 'Quality check and order completion',
    icon: '✅',
    defaultRoute: '/kitchen?tab=expo'
  },
  {
    type: 'bar',
    label: 'Bar Station',
    description: 'Beverage orders and preparation',
    icon: '🍹',
    defaultRoute: '/bar'
  },
  {
    type: 'prep',
    label: 'Prep Station',
    description: 'Food preparation and staging',
    icon: '🥗',
    defaultRoute: '/prep'
  }
];

export default function StationLogin() {
  const navigate = useNavigate();
  const { loginAsStation } = useAuth();
  
  const [selectedStation, setSelectedStation] = useState<StationType | null>(null);
  const [stationName, setStationName] = useState('');
  const [restaurantId] = useState(
    import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow'
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleStationSelect = (station: StationOption) => {
    setSelectedStation(station.type);
    // Auto-generate station name if not provided
    if (!stationName) {
      setStationName(`${station.label} 1`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStation) {
      toast.error('Please select a station type');
      return;
    }
    
    if (!stationName.trim()) {
      toast.error('Please enter a station name');
      return;
    }

    setIsLoading(true);
    
    try {
      await loginAsStation(selectedStation, stationName, restaurantId);
      toast.success(`Station ${stationName} logged in successfully!`);
      logger.info('Station logged in', { stationType: selectedStation, stationName });
      
      // Redirect to appropriate station page
      const station = STATION_OPTIONS.find(s => s.type === selectedStation);
      navigate(station?.defaultRoute || '/kitchen');
    } catch (error: any) {
      logger.error('Station login failed:', error);
      toast.error(error.message || 'Station login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Station Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Select your station to begin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Station Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Station Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              {STATION_OPTIONS.map((station) => (
                <button
                  key={station.type}
                  type="button"
                  onClick={() => handleStationSelect(station)}
                  disabled={isLoading}
                  className={`
                    relative rounded-lg border-2 p-4 flex flex-col items-center text-center
                    transition-all cursor-pointer
                    ${selectedStation === station.type
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span className="text-3xl mb-2">{station.icon}</span>
                  <h3 className="font-semibold text-gray-900">{station.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{station.description}</p>
                  {selectedStation === station.type && (
                    <div className="absolute top-2 right-2">
                      <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Station Name Input */}
          {selectedStation && (
            <div className="transition-all">
              <label htmlFor="station-name" className="block text-sm font-medium text-gray-700">
                Station Name
              </label>
              <div className="mt-1">
                <input
                  id="station-name"
                  name="stationName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-400 focus:border-orange-400 focus:z-10 sm:text-sm"
                  placeholder="e.g., Kitchen 1, Expo Station A"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This name will identify this specific station in the system
              </p>
            </div>
          )}

          {/* Submit Button */}
          {selectedStation && (
            <div>
              <button
                type="submit"
                disabled={isLoading || !stationName.trim()}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-700 hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Start Station'
                )}
              </button>
            </div>
          )}

          {/* Alternative Login Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or use</span>
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
                to="/pin-login"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                PIN Login
              </Link>
            </div>
          </div>
        </form>

        <div className="text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}