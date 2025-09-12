# Chip Monkey Floor Plan Element

## Overview

The Chip Monkey is a special floor plan element available in the Admin → Floor Plan Layout editor. It provides a unique, playful shape option alongside traditional table shapes.

## Features

- **Unique Shape**: Small monkey silhouette icon
- **Smallest Size**: Default 48x48 pixels (ideal for marking special areas)
- **Single Seat**: Configured with 1 seat capacity
- **Full Interaction Support**:
  - Drag to move
  - Rotate with handles
  - Resize (maintains aspect ratio)
  - Duplicate (Ctrl+D)
  - Delete (Del key)
  - Z-order management
  - Snap to grid

## How to Use

1. Navigate to **Admin Dashboard** → **Floor Plan Layout**
2. Click the **Chip Monkey** button in the toolbar (monkey icon)
3. The chip monkey will appear at the center of the canvas
4. Interact with it just like any other table element:
   - Click to select
   - Drag to move
   - Use corner handles to resize
   - Right-click for context menu

## Use Cases

- Mark VIP areas
- Indicate special features (e.g., entertainment zones)
- Create playful elements for family restaurants
- Mark host stations or waiting areas
- Denote special service points

## Technical Details

- **Type**: `chip_monkey`
- **Default Width**: 48px
- **Default Height**: 48px
- **Default Seats**: 1
- **Shape Rendering**: Custom SVG path with monkey silhouette
- **Persistence**: Saves with restaurant floor plan data

## Compatibility

The Chip Monkey element is fully compatible with:
- All existing floor plan operations
- Multi-tenant restaurant contexts
- Save/load functionality
- Export features
- Real-time synchronization

## Troubleshooting

If the Chip Monkey doesn't appear:
1. Ensure you're using the latest version of the application
2. Clear browser cache
3. Check browser console for errors
4. Verify you have proper admin permissions

## Related Features

- [Floor Plan Management](./floor-plan.md)
- [Table Configuration](./tables.md)
- [Restaurant Settings](./settings.md)