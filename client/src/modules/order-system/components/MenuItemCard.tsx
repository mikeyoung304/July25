import React from 'react';
import { MenuItem } from '../../menu/types';
import { Button } from '@/components/ui/button';
import { Coffee, Utensils, Salad, Sandwich, Soup, Leaf, ChefHat } from 'lucide-react';

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

  const getCategoryIcon = (category: string) => {
    const iconProps = { size: 48, className: "text-accent-600" };
    
    switch (category) {
      case 'Beverages':
        return <Coffee {...iconProps} />;
      case 'Starters':
        return <Utensils {...iconProps} />;
      case 'Salads':
        return <Salad {...iconProps} />;
      case 'Sandwiches':
        return <Sandwich {...iconProps} />;
      case 'Bowls':
        return <Soup {...iconProps} />;
      case 'Vegan':
        return <Leaf {...iconProps} />;
      case 'Entrees':
        return <ChefHat {...iconProps} />;
      default:
        return <Utensils {...iconProps} />;
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-300 ease-spring cursor-pointer overflow-hidden group"
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
      <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-accent-50 to-accent-100">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center">
            <div className="text-center space-y-2">
              {getCategoryIcon(item.category)}
              <p className="text-sm text-accent-700 font-medium">Farm Fresh</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-primary">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-accent">
              {formatPrice(item.price)}
            </span>
            {item.calories && (
              <span className="text-xs text-neutral-500">
                {item.calories} cal
              </span>
            )}
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={`Add ${item.name} to cart`}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};