import React from 'react';
import { MenuItem } from '../../menu/types';
import { Button } from '@/components/ui/button';
import { Coffee, Utensils, Salad, Sandwich, Soup, Leaf, ChefHat, ShoppingCart } from 'lucide-react';
import { CardTitle, Price, BodyLarge, Caption } from '@/components/ui/Typography';
import { spacing } from '@/lib/typography';

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
    const iconProps = { size: 56, className: "text-accent" };
    
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
      className="bg-white rounded-xl shadow-elevation-2 hover:shadow-elevation-3 hover:-translate-y-1 transition-all duration-300 ease-spring cursor-pointer overflow-hidden group border border-neutral-100/30"
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
      <div className="aspect-w-16 aspect-h-9 bg-gradient-to-br from-accent-50 to-accent-100 relative overflow-hidden">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-56 flex items-center justify-center bg-gradient-to-br from-accent-50 to-accent-100">
            <div className="text-center space-y-3 group-hover:scale-105 transition-transform duration-300">
              {getCategoryIcon(item.category)}
              <Caption className="text-accent-700 font-medium">Farm Fresh</Caption>
            </div>
          </div>
        )}
      </div>
      
      <div className={`${spacing.component.card} ${spacing.content.stack}`}>
        <div className={spacing.content.stackSmall}>
          <CardTitle as="h3" className="group-hover:text-primary-600 transition-colors">
            {item.name}
          </CardTitle>
          {item.description && (
            <BodyLarge className="text-neutral-600 line-clamp-2">
              {item.description}
            </BodyLarge>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <div className="flex flex-col space-y-1">
            <Price className="text-accent">
              {formatPrice(item.price)}
            </Price>
            {item.calories && (
              <Caption className="text-neutral-500">
                {item.calories} cal
              </Caption>
            )}
          </div>
          
          <Button
            variant="teal"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={`Add ${item.name} to cart`}
            className="min-w-[140px] gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};