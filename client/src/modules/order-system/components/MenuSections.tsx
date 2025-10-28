import React from 'react';
import { MenuItem } from '../../menu/types';
import { useMenuItems } from '../../menu/hooks/useMenuItems';
import { MenuItemCard } from './MenuItemCard';
// Using inline Tailwind classes for better responsive control

interface MenuSectionsProps {
  searchQuery: string;
  dietaryFilters?: string[];
  sortOption?: string;
  onItemClick: (item: MenuItem) => void;
}

// Dynamic menu sections based on actual categories and items
interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export const MenuSections: React.FC<MenuSectionsProps> = ({ 
  searchQuery, 
  dietaryFilters = [],
  sortOption = 'default',
  onItemClick 
}) => {
  const { items, loading, error } = useMenuItems();

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let filtered = items;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply dietary filters
    if (dietaryFilters.length > 0) {
      filtered = filtered.filter(item => {
        // Check if item matches any dietary filter
        if (dietaryFilters.includes('vegan') && item.category?.name === 'Vegan') return true;
        if (dietaryFilters.includes('keto') && item.name.toLowerCase().includes('keto')) return true;
        if (dietaryFilters.includes('gluten-free') && item.description?.toLowerCase().includes('gluten')) return false;
        if (dietaryFilters.includes('pescatarian') && 
            (item.name.toLowerCase().includes('fish') || 
             item.name.toLowerCase().includes('salmon') || 
             item.name.toLowerCase().includes('tuna'))) return true;
        
        // If no filters match and filters are selected, exclude the item
        return dietaryFilters.length === 0;
      });
    }
    
    // Apply sorting
    const sorted = [...filtered];
    switch (sortOption) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'calories':
        sorted.sort((a, b) => (a.calories || 999) - (b.calories || 999));
        break;
      case 'popular':
        // For now, put bowls and salads first as they're popular
        sorted.sort((a, b) => {
          const popularCategories = ['Bowls', 'Salads'];
          const aPopular = a.category?.name && popularCategories.includes(a.category.name) ? 0 : 1;
          const bPopular = b.category?.name && popularCategories.includes(b.category.name) ? 0 : 1;
          return aPopular - bPopular;
        });
        break;
      default:
        // Keep original order
        break;
    }
    
    return sorted;
  }, [items, searchQuery, dietaryFilters, sortOption]);

  // Create menu sections dynamically from actual items
  const menuSections = React.useMemo(() => {
    if (filteredItems.length === 0) return [];

    // Group items by category
    const categoryGroups = new Map<string, MenuItem[]>();
    
    filteredItems.forEach(item => {
      const categoryName = item.category?.name || 'Other';
      if (!categoryGroups.has(categoryName)) {
        categoryGroups.set(categoryName, []);
      }
      categoryGroups.get(categoryName)!.push(item);
    });

    // Define section metadata matching restaurant's menu style
    const sectionMetadata: Record<string, { title: string; order: number; description?: string }> = {
      'Starters': { title: 'STARTERS', order: 1, description: 'Perfect for sharing or starting your meal' },
      'Nachos': { title: 'NACHOS', order: 2, description: 'Loaded with fresh ingredients' },
      'Salads': { title: 'SALADS', order: 3, description: 'Fresh, healthy options packed with flavor' },
      'Sandwiches': { title: 'SANDWICHES', order: 4, description: 'Served with choice of side and pickle' },
      'Bowls': { title: 'BOWLS', order: 5, description: 'Hearty and satisfying bowls' },
      'Vegan': { title: 'VEGAN', order: 6, description: 'Plant-based selections' },
      'Entrees': { title: 'ENTREES', order: 7, description: 'Served with 2 sides and cornbread' },
      'Fresh Sides': { title: 'FRESH SIDES', order: 8, description: 'Perfect accompaniments to any meal' },
      'Beverages': { title: 'Beverages', order: 9 },
      'Other': { title: 'More Items', order: 10 }
    };

    // Convert to sections array with metadata
    const sections: Array<MenuSection & { description?: string }> = [];
    categoryGroups.forEach((items, categoryName) => {
      const metadata = sectionMetadata[categoryName] || sectionMetadata['Other'];
      sections.push({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        title: metadata.title,
        items: items,
        description: metadata.description
      });
    });

    // Sort sections by defined order
    sections.sort((a, b) => {
      const aOrder = sectionMetadata[a.items[0]?.category?.name || 'Other']?.order || 999;
      const bOrder = sectionMetadata[b.items[0]?.category?.name || 'Other']?.order || 999;
      return aOrder - bOrder;
    });

    return sections;
  }, [filteredItems]);

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
        <div className="text-lg text-red-600">Error loading menu items</div>
      </div>
    );
  }

  // If searching or filtering, show results in a single section
  if (searchQuery || dietaryFilters.length > 0) {
    return (
      <div className="mb-12 md:mb-16">
        <div className="mb-8 md:mb-12">
          <div className="flex items-baseline space-x-4">
            <h2 className="text-2xl md:text-3xl font-bold leading-tight text-gray-900">
              Search Results
            </h2>
            <span className="text-lg md:text-xl font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="h-full">
              <MenuItemCard
                item={item}
                onClick={() => onItemClick(item)}
              />
            </div>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-xl md:text-2xl font-medium text-gray-500 mb-2">
              No items found
            </div>
            <div className="text-lg text-gray-400">
              Try searching for something else
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show menu sections with compact spacing to show items above fold
  return (
    <div className="space-y-8 md:space-y-10">
      {menuSections.map((section) => (
        <section key={section.id} id={`section-${section.id}`} className="">
          {/* Section Header - Restaurant style with orange accent */}
          <div className="mb-6 md:mb-8 border-b border-orange-400 pb-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-wide text-orange-500 mb-2">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-sm md:text-base text-gray-600 italic mt-1">
                {section.description}
              </p>
            )}
          </div>

          {/* Items Grid - Responsive with generous spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {section.items.map((item) => (
              <div key={item.id} className="h-full">
                <MenuItemCard
                  item={item}
                  onClick={() => onItemClick(item)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
      {menuSections.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-2xl md:text-3xl font-bold text-gray-700 mb-4">
            Menu Coming Soon
          </div>
          <div className="text-lg text-gray-500">
            We're preparing something delicious for you
          </div>
        </div>
      )}
    </div>
  );
};