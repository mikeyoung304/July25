import React from 'react';
import { MenuItemCard } from './MenuItemCard';
import { MenuItem } from '../../menu/types';
import { MenuSection as MenuSectionType } from '../types/menu-sections';
import { SectionTitle, Body, Caption } from '@/components/ui/Typography';
import { spacing } from '@/lib/typography';

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
    <section id={`section-${section.id}`} className={spacing.page.section}>
      {/* Section Header */}
      <div className={spacing.content.stack}>
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl">
            <span className="text-3xl">{section.icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline space-x-3">
              <SectionTitle>{section.title}</SectionTitle>
              <Caption className="text-neutral-500">({sectionItems.length} items)</Caption>
            </div>
            {section.description && (
              <Body className="text-neutral-600 mt-1">{section.description}</Body>
            )}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${spacing.grid.gapLarge}`}>
        {sectionItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </section>
  );
};