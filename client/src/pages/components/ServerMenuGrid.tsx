import React, { useState, useMemo } from 'react'
import { ApiMenuItem } from '@rebuild/shared'
import { MenuItemGrid, MenuCategoryFilter } from '@/components/shared/MenuItemGrid'
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { findBestMatch } from '@/utils/fuzzyMenuMatcher'
import { cn } from '@/utils'

export interface ServerMenuGridProps {
  /**
   * Callback when a menu item is clicked
   * Receives the full ApiMenuItem object
   */
  onItemClick?: (item: ApiMenuItem) => void

  /**
   * Optional className for custom styling
   */
  className?: string

  /**
   * Show search bar for filtering items
   * @default true
   */
  showSearch?: boolean

  /**
   * Show category filter tabs
   * @default true
   */
  showCategoryFilter?: boolean

  /**
   * Number of columns for the grid (server uses compact 4-column layout)
   * @default { mobile: 2, tablet: 3, desktop: 4 }
   */
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

/**
 * ServerMenuGrid - Server-specific wrapper around MenuItemGrid
 *
 * Features:
 * - Fetches menu items from API (/api/v1/menu/items)
 * - Integrates MenuCategoryFilter for category navigation
 * - Optional fuzzy search with fuzzyMenuMatcher
 * - Compact 4-column layout (no images, minimal descriptions)
 * - Handles loading and error states
 * - Caches menu data to avoid refetching
 * - Matches dashboard styling (teal/green colors)
 *
 * Integration points:
 * - Uses MenuItemGrid for rendering
 * - Uses MenuCategoryFilter for category tabs
 * - Uses useMenuItems hook for data fetching
 * - Uses fuzzyMenuMatcher for search functionality
 *
 * @example
 * ```tsx
 * <ServerMenuGrid
 *   onItemClick={(item) => {
 *     console.log('Selected:', item)
 *     // Add to order, show modifier modal, etc.
 *   }}
 *   showSearch={true}
 *   showCategoryFilter={true}
 * />
 * ```
 */
export const ServerMenuGrid: React.FC<ServerMenuGridProps> = ({
  onItemClick,
  className,
  showSearch = true,
  showCategoryFilter = true,
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4
  }
}) => {
  // Fetch menu items and categories from API
  const { items: menuItems, loading, error } = useMenuItems()

  // Local state for filtering
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')

  // Extract unique categories from menu items with item counts
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; count: number }>()

    menuItems.forEach((item) => {
      if (item.category_id && item.category?.name) {
        const existing = categoryMap.get(item.category_id)
        if (existing) {
          existing.count++
        } else {
          categoryMap.set(item.category_id, {
            id: item.category_id,
            name: item.category.name,
            count: 1
          })
        }
      }
    })

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [menuItems])

  // Filter items by search query and category
  const filteredItems = useMemo(() => {
    let filtered = menuItems

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category_id === selectedCategory)
    }

    // Filter by search query using fuzzy matching
    if (searchQuery.trim()) {
      const searchResult = findBestMatch(searchQuery, filtered, 0.3)
      if (searchResult.item) {
        // If we have a strong match, show just that item
        if (searchResult.confidence > 0.7) {
          filtered = [searchResult.item]
        } else {
          // For weaker matches, show items that contain the search term
          const query = searchQuery.toLowerCase().trim()
          filtered = filtered.filter((item) =>
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
          )
        }
      } else {
        // No fuzzy match, fall back to simple contains
        const query = searchQuery.toLowerCase().trim()
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      }
    }

    return filtered
  }, [menuItems, selectedCategory, searchQuery])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
  }

  // Error state
  if (error) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            Failed to load menu
          </h3>
          <p className="text-gray-600 mb-4">
            {error.message || 'An error occurred while loading the menu. Please try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-10 h-12 text-base"
            disabled={loading}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      )}

      {/* Category filter tabs */}
      {showCategoryFilter && categories.length > 0 && (
        <div className="border-b border-gray-200 pb-4">
          <MenuCategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            className="mb-2"
          />
          {/* Category item count */}
          {selectedCategory && (
            <p className="text-sm text-gray-600 mt-2">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} in{' '}
              {categories.find((c) => c.id === selectedCategory)?.name}
            </p>
          )}
        </div>
      )}

      {/* Search results count */}
      {searchQuery && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
          {filteredItems.length === 0 && (
            <button
              onClick={clearSearch}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Menu item grid */}
      <MenuItemGrid
        items={filteredItems}
        loading={loading}
        selectedCategory={selectedCategory}
        onItemClick={onItemClick}
        columns={columns}
        showDescription={false} // Compact layout - no descriptions
        showImage={false} // Compact layout - no images
        emptyState={
          searchQuery ? (
            <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No items found
              </h3>
              <p className="text-gray-500 mb-4">
                We couldn't find any menu items matching "{searchQuery}"
              </p>
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No menu items available
              </h3>
              <p className="text-gray-500">
                {selectedCategory
                  ? 'Try selecting a different category'
                  : 'Check back later for menu items'}
              </p>
            </div>
          )
        }
      />
    </div>
  )
}

/**
 * Export types for consumers
 */
export type { ApiMenuItem } from '@rebuild/shared'
