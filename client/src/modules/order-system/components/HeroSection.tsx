import React from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-br from-green-600 to-green-700 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Restaurant Info */}
          <div>
            <h1 className="text-4xl font-bold mb-4">
              Grow Fresh Local Food
            </h1>
            <p className="text-xl mb-6 text-green-100">
              Fresh food made with love and local ingredients
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-green-200" />
                <span>1019 Riverside Dr, Macon, GA 31201</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-green-200" />
                <span>Mon-Fri: 11:00 AM - 3:00 PM • Closed Weekends</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-green-200" />
                <span>(478) 743-4663</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="bg-green-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Farm to Table
              </span>
              <span className="bg-green-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Organic
              </span>
              <span className="bg-green-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                Local Ingredients
              </span>
              <span className="bg-green-800 bg-opacity-50 px-3 py-1 rounded-full text-sm">
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
                  <p className="text-sm text-green-100">With grapes & pecans</p>
                </div>
                <span className="font-bold">$13</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Soul Bowl</p>
                  <p className="text-sm text-green-100">Georgia-made soul food</p>
                </div>
                <span className="font-bold">$14</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Peach Chicken</p>
                  <p className="text-sm text-green-100">With 2 sides</p>
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