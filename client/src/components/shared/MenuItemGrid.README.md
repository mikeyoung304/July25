# MenuItemGrid Component

A reusable, responsive menu item grid component designed for use in both kiosk and server interfaces.

## Location

`/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/shared/MenuItemGrid.tsx`

## Components Exported

### 1. MenuItemGrid
Main grid component that displays menu items in a responsive layout.

### 2. MenuItemCard
Individual menu item card component (can be used standalone).

### 3. MenuCategoryFilter
Category filter component for filtering menu items by category.

---

## Props Interfaces

### MenuItemGridProps

```typescript
interface MenuItemGridProps {
  items: ApiMenuItem[];              // Array of menu items to display
  loading?: boolean;                 // Show loading skeleton
  selectedCategory?: string;         // Filter items by category ID
  onItemClick?: (item: ApiMenuItem) => void; // Callback when item is clicked
  className?: string;                // Additional CSS classes
  columns?: {                        // Responsive column configuration
    mobile?: number;                 // 1-4 columns on mobile
    tablet?: number;                 // 1-4 columns on tablet
    desktop?: number;                // 1-4 columns on desktop
  };
  showDescription?: boolean;         // Show item descriptions (default: true)
  showImage?: boolean;              // Show item images (default: false)
  emptyState?: React.ReactNode;     // Custom empty state component
}
```

### MenuItemCardProps

```typescript
interface MenuItemCardProps {
  item: ApiMenuItem;                 // Menu item to display
  onClick?: (item: ApiMenuItem) => void; // Click handler
  showDescription?: boolean;         // Show description (default: true)
  showImage?: boolean;              // Show image (default: false)
}
```

### MenuCategoryFilterProps

```typescript
interface MenuCategoryFilterProps {
  categories: Array<{ id: string; name: string }>; // Categories to display
  selectedCategory?: string;         // Currently selected category ID
  onCategorySelect: (categoryId?: string) => void; // Selection callback
  className?: string;                // Additional CSS classes
}
```

---

## Features

1. **Responsive Grid Layout**
   - 3-4 columns on desktop
   - 2 columns on tablet
   - 1 column on mobile
   - Fully customizable via `columns` prop

2. **Category Filtering**
   - Built-in category filtering
   - Optional category filter component
   - "All Items" option included

3. **Visual States**
   - Loading skeleton (6 placeholder cards)
   - Empty state (default or custom)
   - Unavailable items (grayed out, disabled)

4. **Item Display**
   - Item name and price (always shown)
   - Optional description
   - Optional image
   - Dietary flags as badges
   - Preparation time
   - Availability status

5. **Styling**
   - Uses ActionButton component (teal/green dashboard colors)
   - Framer Motion animations (hover, tap, entrance)
   - Card-based layout
   - Fully accessible

6. **TypeScript**
   - Fully typed with proper interfaces
   - Uses ApiMenuItem from @rebuild/shared
   - Type-safe callbacks

---

## Usage Examples

### Basic Usage

```typescript
import { MenuItemGrid } from '@/components/shared';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';

function MenuPage() {
  const { items, loading } = useMenuItems();

  const handleItemClick = (item) => {
    console.log('Selected:', item);
  };

  return (
    <MenuItemGrid
      items={items}
      loading={loading}
      onItemClick={handleItemClick}
    />
  );
}
```

### Kiosk Interface (3 columns, with images)

```typescript
import { MenuItemGrid } from '@/components/shared';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';
import { useUnifiedCart } from '@/contexts/cart.hooks';

function KioskMenu() {
  const { items, loading } = useMenuItems();
  const { addItem } = useUnifiedCart();

  const handleItemClick = (item) => {
    addItem(item, 1);
  };

  return (
    <MenuItemGrid
      items={items}
      loading={loading}
      onItemClick={handleItemClick}
      columns={{
        mobile: 1,
        tablet: 2,
        desktop: 3
      }}
      showDescription={true}
      showImage={true}
    />
  );
}
```

### Server Interface (4 columns, compact)

```typescript
import { MenuItemGrid } from '@/components/shared';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';

function ServerOrderMenu({ onAddItem }) {
  const { items, loading } = useMenuItems();

  return (
    <MenuItemGrid
      items={items}
      loading={loading}
      onItemClick={onAddItem}
      columns={{
        mobile: 2,
        tablet: 3,
        desktop: 4
      }}
      showDescription={false}
      showImage={false}
    />
  );
}
```

### With Category Filtering

```typescript
import { useState } from 'react';
import { MenuItemGrid, MenuCategoryFilter } from '@/components/shared';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';

function MenuWithCategories() {
  const { items, loading } = useMenuItems();
  const [selectedCategory, setSelectedCategory] = useState<string>();

  // Extract categories
  const categories = Array.from(
    new Map(
      items
        .filter(item => item.category)
        .map(item => [item.category!.id, item.category!])
    ).values()
  ).map(cat => ({ id: cat.id, name: cat.name }));

  return (
    <div className="space-y-6">
      <MenuCategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      <MenuItemGrid
        items={items}
        loading={loading}
        selectedCategory={selectedCategory}
        onItemClick={(item) => console.log(item)}
      />
    </div>
  );
}
```

### Custom Empty State

```typescript
import { MenuItemGrid } from '@/components/shared';
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems';

function MenuWithCustomEmpty() {
  const { items, loading } = useMenuItems();

  return (
    <MenuItemGrid
      items={items}
      loading={loading}
      emptyState={
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold">Kitchen is preparing!</h3>
          <p>Check back soon for fresh items</p>
        </div>
      }
    />
  );
}
```

---

## Styling & Colors

The component uses the teal/green color scheme from the dashboard:

- **Available items**: `#4ECDC4` (teal)
- **Unavailable items**: `#9CA3AF` (gray)
- **Category buttons (active)**: `#4ECDC4` (teal)
- **Category buttons (inactive)**: `#E5E7EB` (light gray)

All colors can be customized via the ActionButton component's `color` prop.

---

## Dependencies

- **@rebuild/shared** - ApiMenuItem type
- **@/components/ui/ActionButton** - Button styling
- **@/components/ui/card** - Card component
- **@/utils** - cn utility for className merging
- **framer-motion** - Animations
- **react** - Core React

---

## Accessibility

- All buttons have proper click handlers
- Disabled state for unavailable items
- Semantic HTML structure
- Keyboard navigation support via ActionButton
- Screen reader friendly

---

## Performance

- Uses React.FC for type safety
- Efficient filtering (runs once per render)
- Skeleton loading (6 cards)
- Framer Motion optimized animations
- No unnecessary re-renders

---

## File Structure

```
/client/src/components/shared/
├── MenuItemGrid.tsx           # Main component
├── MenuItemGrid.example.tsx   # Usage examples
├── MenuItemGrid.README.md     # This file
└── index.ts                   # Barrel export
```

---

## Migration Guide

### From VoiceOrderingMode to MenuItemGrid

Before:
```typescript
// Custom grid implementation in VoiceOrderingMode.tsx
<div className="grid grid-cols-3 gap-4">
  {menuItems.map(item => (
    <button onClick={() => handleClick(item)}>
      {item.name} - ${item.price}
    </button>
  ))}
</div>
```

After:
```typescript
import { MenuItemGrid } from '@/components/shared';

<MenuItemGrid
  items={menuItems}
  onItemClick={handleClick}
  columns={{ mobile: 1, tablet: 2, desktop: 3 }}
/>
```

### From SeatSelectionModal Pattern to MenuItemGrid

The 3-column grid pattern from SeatSelectionModal has been adapted to MenuItemGrid with full responsiveness.

---

## Future Enhancements

Potential improvements:

1. Search/filter by dietary flags
2. Sort by price, name, popularity
3. Infinite scroll for large menus
4. Grid vs. List view toggle
5. Item detail modal on click
6. Add to cart with quantity selector
7. Item customization modal
8. Favorites/starred items

---

## Testing

The component has been tested for:
- TypeScript compilation
- Import resolution
- Basic rendering
- Props interface validation

For full test coverage, add:
- Unit tests with React Testing Library
- Integration tests with mock data
- E2E tests in kiosk/server flows

---

## Support

For issues or questions, refer to:
- Example file: `MenuItemGrid.example.tsx`
- API types: `/shared/api-types.ts`
- ActionButton: `/client/src/components/ui/ActionButton.tsx`
