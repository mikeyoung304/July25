import React from 'react';
// import { Search, X } from 'lucide-react'; // Icons not currently used

interface MenuSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MenuSearch: React.FC<MenuSearchProps> = ({ 
  searchQuery: _searchQuery, 
  onSearchChange: _onSearchChange 
}) => {
  // This component is now integrated into the unified search bar in CustomerOrderPage
  // This component can be removed or kept as a fallback
  return null;
};