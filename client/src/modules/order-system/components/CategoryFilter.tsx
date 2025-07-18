import React from 'react';
import { useMenuItems } from '../../menu/hooks/useMenuItems';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ 
  selectedCategory, 
  onCategoryChange 
}) => {
  const { items } = useMenuItems();

  const categories = React.useMemo(() => {
    const categorySet = new Set<string>();
    items.forEach(item => {
      if (item.category) {
        categorySet.add(item.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [items]);

  return (
    <div className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 ${
              selectedCategory === null
                ? 'bg-macon-teal text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => onCategoryChange(null)}
            aria-pressed={selectedCategory === null}
          >
            All Items
          </button>
          
          {categories.map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 ${
                selectedCategory === category
                  ? 'bg-macon-teal text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => onCategoryChange(category)}
              aria-pressed={selectedCategory === category}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};