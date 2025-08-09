import React from 'react';
// Icons removed for cleaner, text-focused design

interface DietaryFiltersProps {
  selectedFilters: string[];
  onFilterToggle: (filter: string) => void;
}

export const DietaryFilters: React.FC<DietaryFiltersProps> = ({ 
  selectedFilters, 
  onFilterToggle 
}) => {
  const filters = [
    { id: 'vegan', label: 'Vegan' },
    { id: 'gluten-free', label: 'Gluten Free' },
    { id: 'keto', label: 'Keto' },
    { id: 'pescatarian', label: 'Pescatarian' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((filter) => {
        const isSelected = selectedFilters.includes(filter.id);
        
        return (
          <button
            key={filter.id}
            onClick={() => onFilterToggle(filter.id)}
            className={`
              px-4 py-3 text-base font-medium border-2 rounded-xl transition-all duration-200 min-h-[48px]
              ${isSelected 
                ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:bg-teal-50'
              }
            `}
            aria-pressed={isSelected}
            aria-label={`Filter by ${filter.label}`}
          >
            {filter.label}
          </button>
        );
      })}
      
      {selectedFilters.length > 0 && (
        <button
          onClick={() => selectedFilters.forEach(f => onFilterToggle(f))}
          className="text-base font-medium text-gray-500 hover:text-gray-700 px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200 min-h-[48px]"
          aria-label="Clear all filters"
        >
          Clear All
        </button>
      )}
    </div>
  );
};