import React from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
import { RestaurantData } from '../hooks/useRestaurantData';

interface HeroSectionProps {
  restaurant: RestaurantData | null;
  loading?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ restaurant, loading }) => {
  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-accent to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-10 bg-accent-400 rounded mb-4 max-w-md"></div>
            <div className="h-6 bg-accent-400 rounded mb-6 max-w-lg"></div>
            <div className="space-y-3">
              <div className="h-4 bg-accent-400 rounded max-w-sm"></div>
              <div className="h-4 bg-accent-400 rounded max-w-sm"></div>
              <div className="h-4 bg-accent-400 rounded max-w-sm"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-accent to-accent-600 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Restaurant Info */}
          <div>
            <h1 className="text-4xl font-bold mb-4">
              {restaurant?.name || 'Restaurant'}
            </h1>
            <p className="text-xl mb-6 text-accent-100">
              {restaurant?.description || 'Fresh food made with love and local ingredients'}
            </p>
            
            <div className="space-y-3 mb-6">
              {restaurant?.address && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-accent-200" />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant?.businessHours && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-accent-200" />
                  <span>{restaurant.businessHours}</span>
                </div>
              )}
              {restaurant?.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-accent-200" />
                  <span>{restaurant.phone}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="bg-accent-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Farm to Table
              </span>
              <span className="bg-accent-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Organic
              </span>
              <span className="bg-accent-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Local Ingredients
              </span>
              <span className="bg-accent-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Vegan Options
              </span>
            </div>
          </div>

          {/* Right side - Featured Items */}
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Today's Favorites</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Mom's Chicken Salad</p>
                  <p className="text-sm text-accent-100">With grapes & pecans</p>
                </div>
                <span className="font-bold">$13</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Soul Bowl</p>
                  <p className="text-sm text-accent-100">Georgia-made soul food</p>
                </div>
                <span className="font-bold">$14</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Peach Chicken</p>
                  <p className="text-sm text-accent-100">With 2 sides</p>
                </div>
                <span className="font-bold">$16</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};