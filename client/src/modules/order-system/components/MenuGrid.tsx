import React, { useCallback } from 'react';
import { MenuItemCard } from './MenuItemCard';
import { useMenuItems } from '../../menu/hooks/useMenuItems';
import { MenuItem } from '../../menu/types';

interface MenuGridProps {
  selectedCategory: string | null;
  searchQuery: string;
  onItemClick: (item: MenuItem) => void;
  onQuickAdd?: (item: MenuItem) => void; // Optional: direct add handler
}

export const MenuGrid = React.memo(({
  selectedCategory,
  searchQuery,
  onItemClick,
  onQuickAdd
}: MenuGridProps) => {
  const { items, loading, error } = useMenuItems();

  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      const matchesCategory = !selectedCategory || item.category?.name === selectedCategory;
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch && item.is_available;
    });
  }, [items, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading menu items</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {filteredItems.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  );
})

MenuGrid.displayName = 'MenuGrid'