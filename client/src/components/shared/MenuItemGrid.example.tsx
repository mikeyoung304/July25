/**
 * Example usage of MenuItemGrid component
 *
 * This file demonstrates how to use the MenuItemGrid component
 * in both kiosk and server interfaces.
 */

import React, { useState } from 'react';
import { MenuItemGrid, MenuCategoryFilter } from '@/components/shared';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { ApiMenuItem } from '@rebuild/shared';

// Example 1: Basic usage with all menu items
export function BasicMenuGridExample() {
  const { items, loading } = useMenuItems();

  const handleItemClick = (item: ApiMenuItem) => {
    console.log('Item selected:', item);
    // Add to cart, show details modal, etc.
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Menu</h2>
      <MenuItemGrid
        items={items}
        loading={loading}
        onItemClick={handleItemClick}
        showDescription={true}
        showImage={false}
      />
    </div>
  );
}

// Example 2: With category filtering
export function MenuGridWithCategoryFilterExample() {
  const { items, loading } = useMenuItems();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  // Extract unique categories from items
  const categories = Array.from(
    new Map(
      items
        .filter((item) => item.category)
        .map((item) => [item.category!.id, item.category!])
    ).values()
  ).map((cat) => ({
    id: cat.id,
    name: cat.name
  }));

  const handleItemClick = (item: ApiMenuItem) => {
    console.log('Item selected:', item);
  };

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">Menu</h2>

      <MenuCategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      <MenuItemGrid
        items={items}
        loading={loading}
        selectedCategory={selectedCategory}
        onItemClick={handleItemClick}
        showDescription={true}
        showImage={false}
      />
    </div>
  );
}

// Example 3: Kiosk interface with custom columns and images
export function KioskMenuGridExample() {
  const { items, loading } = useMenuItems();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const handleItemClick = (item: ApiMenuItem) => {
    console.log('Adding to cart:', item);
    // Add to cart logic here
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Order Your Meal</h1>

      <MenuItemGrid
        items={items}
        loading={loading}
        selectedCategory={selectedCategory}
        onItemClick={handleItemClick}
        columns={{
          mobile: 1,
          tablet: 2,
          desktop: 3
        }}
        showDescription={true}
        showImage={true}
        className="max-w-7xl mx-auto"
      />
    </div>
  );
}

// Example 4: Server interface with 4-column layout
export function ServerMenuGridExample() {
  const { items, loading } = useMenuItems();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const handleItemClick = (item: ApiMenuItem) => {
    console.log('Adding to order:', item);
    // Add to order for specific seat/table
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Add Items to Order</h2>

      <MenuItemGrid
        items={items}
        loading={loading}
        selectedCategory={selectedCategory}
        onItemClick={handleItemClick}
        columns={{
          mobile: 2,
          tablet: 3,
          desktop: 4
        }}
        showDescription={false}
        showImage={false}
      />
    </div>
  );
}

// Example 5: Custom empty state
export function MenuGridWithCustomEmptyStateExample() {
  const { items, loading } = useMenuItems();

  return (
    <div className="p-8">
      <MenuItemGrid
        items={items}
        loading={loading}
        emptyState={
          <div className="text-center py-12">
            <h3 className="text-2xl font-bold text-gray-700 mb-4">
              No items available right now
            </h3>
            <p className="text-gray-500">
              Our kitchen is preparing fresh items. Please check back soon!
            </p>
          </div>
        }
      />
    </div>
  );
}
