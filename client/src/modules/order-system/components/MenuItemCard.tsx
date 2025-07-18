import React from 'react';
import { MenuItem } from '../../menu/types';

interface MenuItemCardProps {
  item: MenuItem;
  onClick: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onClick }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${item.name} - ${formatPrice(item.price)}`}
    >
      <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-green-50 to-green-100">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-2 block">
                {item.category === 'Beverages' && '🥤'}
                {item.category === 'Starters' && '🍽️'}
                {item.category === 'Salads' && '🥗'}
                {item.category === 'Sandwiches' && '🥪'}
                {item.category === 'Bowls' && '🍲'}
                {item.category === 'Vegan' && '🌱'}
                {item.category === 'Entrees' && '🍴'}
              </span>
              <span className="text-sm text-green-700 font-medium">Farm Fresh</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-green-600">
            {formatPrice(item.price)}
          </span>
          
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={`Add ${item.name} to cart`}
          >
            Add
          </button>
        </div>

        {item.calories && (
          <p className="text-xs text-gray-500 mt-2">
            {item.calories} cal
          </p>
        )}
      </div>
    </div>
  );
};