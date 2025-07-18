import React from 'react';
import { MenuSection } from './MenuSection';
import { MenuItem } from '../../menu/types';
import { menuSections } from '../types/menu-sections';
import { useMenuItems } from '../../menu/hooks/useMenuItems';

interface MenuSectionsProps {
  searchQuery: string;
  onItemClick: (item: MenuItem) => void;
}

export const MenuSections: React.FC<MenuSectionsProps> = ({ 
  searchQuery, 
  onItemClick 
}) => {
  const { items, loading, error } = useMenuItems();

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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

  // If searching, show results in a single section
  if (searchQuery) {
    return (
      <div className="py-6">
        <div className="mb-6 px-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Search Results ({filteredItems.length} items)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6">
          {filteredItems.map((item) => (
            <div key={item.id}>
              {React.createElement(require('./MenuItemCard').MenuItemCard, {
                item,
                onClick: () => onItemClick(item)
              })}
            </div>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    );
  }

  // Show menu sections
  return (
    <div className="py-6">
      {menuSections.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          items={filteredItems}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
};