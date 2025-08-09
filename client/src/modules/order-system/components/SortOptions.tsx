import React from 'react';
// Icons removed for cleaner, text-focused design

interface SortOptionsProps {
  currentSort: string;
  onSortChange: (sort: string) => void;
}

export const SortOptions: React.FC<SortOptionsProps> = ({ 
  currentSort, 
  onSortChange 
}) => {
  const sortOptions = [
    { id: 'default', label: 'Default' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'calories', label: 'Calories: Low to High' },
    { id: 'popular', label: 'Most Popular' },
  ];

  return (
    <select
      value={currentSort}
      onChange={(e) => onSortChange(e.target.value)}
      className="px-4 py-3 border-2 border-gray-300 rounded-xl text-base font-medium focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 bg-white min-h-[48px] cursor-pointer transition-all duration-200"
      aria-label="Sort menu items"
    >
      {sortOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
};