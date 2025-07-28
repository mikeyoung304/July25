import React from 'react';
import { Search, X } from 'lucide-react';

interface MenuSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MenuSearch: React.FC<MenuSearchProps> = ({ 
  searchQuery, 
  onSearchChange 
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="px-6 py-4 bg-white">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search menu items..."
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-macon-teal focus:border-transparent"
          aria-label="Search menu items"
        />
        
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};