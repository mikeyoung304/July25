import React from 'react';
import { MenuSection } from './MenuSection';
import { MenuItem } from '../../menu/types';
import { menuSections } from '../types/menu-sections';
import { useMenuItems } from '../../menu/hooks/useMenuItems';
import { MenuItemCard } from './MenuItemCard';
import { SectionTitle, Body } from '@/components/ui/Typography';
import { spacing } from '@/lib/typography';

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Body className="text-danger">Error loading menu items</Body>
      </div>
    );
  }

  // If searching, show results in a single section
  if (searchQuery) {
    return (
      <div className={spacing.page.section}>
        <div className={spacing.content.stackLarge}>
          <SectionTitle>
            Search Results ({filteredItems.length} items)
          </SectionTitle>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${spacing.grid.gapLarge}`}>
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Body className="text-neutral-500">No items found for "{searchQuery}"</Body>
          </div>
        )}
      </div>
    );
  }

  // Show menu sections
  return (
    <div className={spacing.content.stackLarge}>
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