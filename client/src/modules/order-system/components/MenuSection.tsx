import React from 'react';
import { MenuItemCard } from './MenuItemCard';
import { MenuItem } from '../../menu/types';
import { MenuSection as MenuSectionType } from '../types/menu-sections';

interface MenuSectionProps {
  section: MenuSectionType;
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
}

export const MenuSection: React.FC<MenuSectionProps> = ({ 
  section, 
  items,
  onItemClick 
}) => {
  // Filter items that belong to this section
  const sectionItems = items.filter(item => section.items.includes(item.id));

  if (sectionItems.length === 0) return null;

  return (
    <div id={`section-${section.id}`} className="mb-12">
      {/* Section Header */}
      <div className="mb-6 px-6">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-2xl">{section.icon}</span>
          <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
          <span className="text-sm text-gray-500">({sectionItems.length} items)</span>
        </div>
        {section.description && (
          <p className="text-gray-600">{section.description}</p>
        )}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6">
        {sectionItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
};