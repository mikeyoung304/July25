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
      <div className="bg-neutral-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2 max-w-md"></div>
            <div className="h-4 bg-gray-200 rounded max-w-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex items-center justify-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h2 className="text-lg text-gray-600 mb-1">
              {restaurant?.description || 'Fresh food made with love'}
            </h2>
            <div className="flex items-center justify-center sm:justify-start flex-wrap gap-4 sm:gap-0 sm:space-x-6 text-sm text-gray-500">
              {restaurant?.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant?.businessHours && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{restaurant.businessHours}</span>
                </div>
              )}
              {restaurant?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{restaurant.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};