import React from 'react';
import { motion } from 'framer-motion';
import { ApiMenuItem } from '@rebuild/shared';
import { ActionButton } from '@/components/ui/ActionButton';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils';

export interface MenuItemGridProps {
  items: ApiMenuItem[];
  loading?: boolean;
  selectedCategory?: string;
  onItemClick?: (item: ApiMenuItem) => void;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  showDescription?: boolean;
  showImage?: boolean;
  emptyState?: React.ReactNode;
}

export interface MenuItemCardProps {
  item: ApiMenuItem;
  onClick?: (item: ApiMenuItem) => void;
  showDescription?: boolean;
  showImage?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onClick,
  showDescription = true,
  showImage = false
}) => {
  const handleClick = () => {
    if (onClick && item.isAvailable) {
      onClick(item);
    }
  };

  return (
    <motion.div
      whileHover={item.isAvailable ? { scale: 1.02 } : undefined}
      whileTap={item.isAvailable ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ActionButton
        onClick={handleClick}
        disabled={!item.isAvailable}
        color={item.isAvailable ? '#4ECDC4' : '#9CA3AF'}
        variant="solid"
        fullWidth
        className={cn(
          'h-full min-h-[120px] flex-col items-start justify-start text-left p-6',
          !item.isAvailable && 'opacity-60'
        )}
      >
        <div className="w-full space-y-2">
          {showImage && item.imageUrl && (
            <div className="w-full h-32 mb-3 rounded-lg overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex justify-between items-start gap-2 w-full">
            <h3 className="font-semibold text-lg text-white leading-tight flex-1">
              {item.name}
            </h3>
            <span className="font-bold text-lg text-white whitespace-nowrap">
              ${item.price.toFixed(2)}
            </span>
          </div>

          {showDescription && item.description && (
            <p className="text-sm text-white/90 line-clamp-2">
              {item.description}
            </p>
          )}

          {item.dietaryFlags && item.dietaryFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.dietaryFlags.map((flag) => (
                <span
                  key={flag}
                  className="text-xs px-2 py-1 bg-white/20 rounded-full text-white"
                >
                  {flag}
                </span>
              ))}
            </div>
          )}

          {!item.isAvailable && (
            <span className="text-sm font-semibold text-white/80">
              Currently Unavailable
            </span>
          )}

          {item.preparationTime && (
            <span className="text-xs text-white/70">
              Prep time: {item.preparationTime} min
            </span>
          )}
        </div>
      </ActionButton>
    </motion.div>
  );
};

export const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  loading = false,
  selectedCategory,
  onItemClick,
  className,
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3
  },
  showDescription = true,
  showImage = false,
  emptyState
}) => {
  // Filter items by category if selected
  const filteredItems = selectedCategory
    ? items.filter((item) => item.categoryId === selectedCategory)
    : items;

  // Loading state
  if (loading) {
    return (
      <div className={cn('grid gap-4', className)}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-6 h-32 animate-pulse bg-gray-200" />
        ))}
      </div>
    );
  }

  // Empty state
  if (filteredItems.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }

    return (
      <Card className="p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No menu items found
        </h3>
        <p className="text-gray-500">
          {selectedCategory
            ? 'Try selecting a different category'
            : 'Check back later for menu items'}
        </p>
      </Card>
    );
  }

  // Generate responsive grid classes
  const gridClasses = cn(
    'grid gap-4',
    {
      'grid-cols-1': columns.mobile === 1,
      'grid-cols-2': columns.mobile === 2,
      'grid-cols-3': columns.mobile === 3,
      'grid-cols-4': columns.mobile === 4
    },
    {
      'sm:grid-cols-1': columns.tablet === 1,
      'sm:grid-cols-2': columns.tablet === 2,
      'sm:grid-cols-3': columns.tablet === 3,
      'sm:grid-cols-4': columns.tablet === 4
    },
    {
      'lg:grid-cols-1': columns.desktop === 1,
      'lg:grid-cols-2': columns.desktop === 2,
      'lg:grid-cols-3': columns.desktop === 3,
      'lg:grid-cols-4': columns.desktop === 4
    },
    className
  );

  return (
    <div className={gridClasses}>
      {filteredItems.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          onClick={onItemClick}
          showDescription={showDescription}
          showImage={showImage}
        />
      ))}
    </div>
  );
};

// Category filter component that can be used with MenuItemGrid
export interface MenuCategoryFilterProps {
  categories: Array<{ id: string; name: string }>;
  selectedCategory?: string;
  onCategorySelect: (categoryId?: string) => void;
  className?: string;
}

export const MenuCategoryFilter: React.FC<MenuCategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  className
}) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <ActionButton
        onClick={() => onCategorySelect(undefined)}
        color={!selectedCategory ? '#4ECDC4' : '#E5E7EB'}
        variant="solid"
        size="small"
        className={cn(
          'transition-all',
          !selectedCategory ? 'text-white' : 'text-gray-700'
        )}
      >
        All Items
      </ActionButton>
      {categories.map((category) => (
        <ActionButton
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          color={selectedCategory === category.id ? '#4ECDC4' : '#E5E7EB'}
          variant="solid"
          size="small"
          className={cn(
            'transition-all',
            selectedCategory === category.id ? 'text-white' : 'text-gray-700'
          )}
        >
          {category.name}
        </ActionButton>
      ))}
    </div>
  );
};
