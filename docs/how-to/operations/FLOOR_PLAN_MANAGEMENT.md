# Floor Plan Management Guide

**Last Updated:** 2025-11-07
**Audience:** Restaurant Managers, Administrators
**Complexity:** Intermediate

## Overview

The Floor Plan Editor allows you to visually design and manage your restaurant's table layout. This drag-and-drop interface makes it easy to create, position, and configure tables for optimal service workflow.

## Accessing the Floor Plan Editor

1. Navigate to the **Admin Dashboard**
2. Click on **Floor Plan Editor** in the navigation menu
3. The editor will load your existing floor plan (if any)

**Required Permission:** `owner` or `manager` role

## Authorization & Security

### Permission Requirements

Floor plan management requires the `tables:manage` scope, which is granted to:

- ✅ **Owner** - Full access to all floor plan operations
- ✅ **Manager** - Full access to create, edit, and delete tables
- ❌ **Server** - Read-only access (cannot modify floor plan)
- ❌ **Kitchen/Cashier/Expo** - No access to floor plan editor

### API-Level Protection

All table modification endpoints are protected by scope-based authorization:
- Creating tables: Requires `tables:manage` scope
- Updating tables: Requires `tables:manage` scope
- Deleting tables: Requires `tables:manage` scope
- Batch updates: Requires `tables:manage` scope

Attempting to modify tables without proper authorization will result in a `403 Forbidden` error.

### UI-Level Protection

The Admin Dashboard and Floor Plan Editor are protected by role guards that verify the user has appropriate permissions before rendering the interface. Users without the required role will see a warning message.

## Creating Tables

### Quick Create

1. Click the **Add Table** button in the toolbar
2. Choose a table shape:
   - **Circle**: Round tables (common for 2-4 guests)
   - **Square**: Square tables (2-4 guests)
   - **Rectangle**: Rectangular tables (4-8 guests)
   - **Chip Monkey**: Special decorative element
3. The table appears in the center of the canvas
4. Drag it to the desired position

### Table Properties

Each table has the following configurable properties:

| Property | Description | Example |
|----------|-------------|---------|
| **Label** | Table identifier displayed to staff | `T1`, `Table 5`, `Patio-3` |
| **Seats** | Number of guests the table can accommodate | `2`, `4`, `6` |
| **Type** | Shape of the table | `circle`, `rectangle`, `square` |
| **Position** | X/Y coordinates on the canvas | `(100, 200)` |
| **Size** | Width and height in pixels | `80 x 80` |
| **Rotation** | Angle of rotation (0-360 degrees) | `45°` |
| **Status** | Current table availability | `available`, `occupied`, `reserved` |
| **Z-Index** | Layering order (higher = on top) | `1`, `2`, `3` |

## Editing Tables

### Select a Table

- **Click** on a table to select it
- Selected tables display with a blue outline
- The **Table Editor panel** appears on the right with editable properties

### Modify Properties

In the Table Editor panel:

1. **Change Label**: Edit the text field (e.g., "T1" → "Table 1")
2. **Adjust Seats**: Use number input (1-12 typical range)
3. **Resize**: Adjust width/height sliders
4. **Rotate**: Use rotation dial or enter degrees directly
5. **Change Status**:
   - `available` (green) - Ready for seating
   - `occupied` (red) - Currently in use
   - `reserved` (yellow) - Held for reservation
   - `cleaning` (gray) - Being cleaned/reset
   - `unavailable` (dark gray) - Out of service

### Move Tables

**Drag and Drop:**
- Click and hold on a table
- Drag to the desired position
- Release to drop

**Precise Positioning:**
- Use the X/Y position inputs in the Table Editor
- Arrow keys for fine adjustments (1-pixel increments)

**Snap to Grid:**
- Enable "Snap to Grid" in the toolbar
- Tables align to grid lines automatically
- Default grid size: 20 pixels

### Rotate Tables

**Visual Rotation:**
- Select a table
- Use the rotation handle (circular arrow icon)
- Drag to rotate

**Precise Rotation:**
- Enter exact degrees in the Table Editor (0-360)
- Common angles: 0° (horizontal), 45° (diagonal), 90° (vertical)

## Canvas Controls

### Zoom

**Zoom In/Out:**
- Click **+** and **-** buttons in toolbar
- Mouse wheel: Scroll up (zoom in), scroll down (zoom out)
- Keyboard: `Ctrl/Cmd + Plus` (in), `Ctrl/Cmd + Minus` (out)

**Zoom Levels:** 25% to 200%

### Pan (Move Canvas)

- **Middle mouse button**: Click and drag
- **Space + Left mouse**: Hold space, click and drag
- **Trackpad**: Two-finger drag

### Auto-Fit

Click **Auto-Fit** in toolbar to automatically:
- Center all tables in the viewport
- Adjust zoom to show all tables
- Optimize spacing for best visibility

**Use case:** After adding many tables, quickly see entire floor plan

## Layout Best Practices

### Table Naming Conventions

- **Numeric**: T1, T2, T3... (simplest)
- **Zone-Based**: Bar-1, Patio-3, Main-5
- **Descriptive**: Window-2, Booth-A, Corner-Table

**Avoid:**
- Duplicate names (system prevents saving)
- Special characters that are hard to type
- Overly long names (display issues on small screens)

### Physical Layout Tips

1. **Spacing**: Leave 80-100 pixels between tables for walkways
2. **Grouping**: Use zones (e.g., bar area, patio, main dining)
3. **Traffic Flow**: Position high-traffic tables near service areas
4. **Accessibility**: Keep accessible tables near entrances/restrooms
5. **Server Stations**: Group tables by server sections

### Visual Organization

- **Z-Index**: Use for overlapping decorative elements (plants, bars)
- **Grid Alignment**: Enable snap-to-grid for professional appearance
- **Color Coding**: Use status colors to visualize sections during service

## Saving Your Floor Plan

### Save Process

1. Click **Save** button in toolbar
2. System validates:
   - No duplicate table labels
   - All tables have valid positions
   - Minimum required data (label, seats, type)
3. Confirmation toast appears: "Floor plan saved! (X tables)"

**Note:** Saving updates the database immediately. Changes are reflected across all connected devices.

### What Gets Saved

For each table:
- Position (x, y coordinates)
- Size (width, height)
- Rotation angle
- Label, seats, status
- Type (circle, square, rectangle)
- Z-index (layer order)
- Active status

### Persistence

- **New Tables**: Created in database with unique UUIDs
- **Existing Tables**: Updated with current properties
- **Deleted Tables**: Soft-deleted (active = false)
- **Real-time Sync**: Changes broadcast via WebSocket to all clients

## Deleting Tables

### Single Table Delete

1. Select the table (click on it)
2. Press **Delete** key or **Backspace**
3. Table is removed from canvas
4. Click **Save** to persist deletion

**Undo:** Use `Ctrl/Cmd + Z` before saving

### Bulk Delete

1. Select first table
2. Hold **Shift** and click additional tables
3. Press **Delete** to remove all selected
4. Save to confirm

**Safety:** Deleted tables aren't removed from database until you save

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo last action |
| `Ctrl/Cmd + Y` | Redo last undone action |
| `Delete / Backspace` | Delete selected table(s) |
| `Ctrl/Cmd + S` | Save floor plan |
| `Ctrl/Cmd + Plus` | Zoom in |
| `Ctrl/Cmd + Minus` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom to 100% |
| `Arrow Keys` | Move selected table (1px) |
| `Shift + Arrow Keys` | Move selected table (10px) |
| `Escape` | Deselect table |
| `Space + Drag` | Pan canvas |

## Multi-Seat Ordering

**New Feature (October 2025):** Tables now support seat-level ordering.

Each table can track individual seat numbers (1, 2, 3, etc.) for:
- Taking orders by seat position
- Splitting checks by seat
- Kitchen routing by seat
- Server workflow optimization

**Configuration:** Set the `seats` property to enable seat tracking (e.g., `seats: 4` enables seats 1-4)

## Integration with Order Management

### During Service

- **Table Status Updates**: Automatically sync with active orders
- **Occupied**: When order is placed for table
- **Available**: When check is closed and payment complete
- **Real-time**: WebSocket updates across all devices

### Server View

Servers see the floor plan with live table statuses:
- Click table → View active orders
- Color-coded by status for quick scanning
- Integrates with Kitchen Display System (KDS)

## Troubleshooting

### Tables Not Saving

**Problem:** "Failed to save floor plan" error

**Solutions:**
1. Check for duplicate table names (error message shows duplicates)
2. Verify you have `owner` or `manager` role with `tables:manage` scope
3. Check internet connection (cloud database)
4. Reload page and try again
5. If you get a `403 Forbidden` error, contact your owner to verify your role permissions

### Tables Appear Out of Position

**Problem:** Tables load in wrong positions after save

**Solution:**
1. Clear browser cache
2. Click **Auto-Fit** to recenter
3. Verify zoom level (should be 100% by default)
4. Check that coordinates are positive numbers

### Performance Issues

**Problem:** Editor is slow with many tables (50+)

**Solutions:**
1. Use **Auto-Fit** instead of manual panning
2. Reduce number of decorative elements (chip_monkey)
3. Disable grid if not needed
4. Close other browser tabs

### Accidental Deletion

**Problem:** Deleted table(s) by mistake

**Solutions:**
1. **Before saving:** Press `Ctrl/Cmd + Z` to undo
2. **After saving:** Contact admin to restore from database backup
3. **Prevention:** Enable "Confirm before delete" in settings (if available)

## API Integration

For developers integrating with the floor plan system:

### Endpoints

All mutation endpoints require authentication and the `tables:manage` scope.

- `GET /api/v1/tables` - Fetch all tables (authentication required)
- `GET /api/v1/tables/:id` - Fetch single table (authentication required)
- `POST /api/v1/tables` - Create new table (requires `tables:manage` scope)
- `PUT /api/v1/tables/:id` - Update existing table (requires `tables:manage` scope)
- `PUT /api/v1/tables/batch` - Batch update multiple tables (requires `tables:manage` scope)
- `DELETE /api/v1/tables/:id` - Delete table - soft delete (requires `tables:manage` scope)
- `PATCH /api/v1/tables/:id/status` - Update table status (requires `tables:manage` scope)

**Authorization Headers Required:**
```
Authorization: Bearer <jwt_token>
X-Restaurant-ID: <restaurant_uuid>
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User lacks `tables:manage` scope
- `404 Not Found` - Table doesn't exist or belongs to different restaurant

### WebSocket Events

- `table:updated` - Table status changed
- `order:created` - New order assigned to table
- `order:completed` - Order complete, table available

See [WebSocket Events Documentation](../../reference/api/WEBSOCKET_EVENTS.md)

## Advanced Features

### Undo/Redo System

The editor maintains a history stack:
- **Undo Stack**: Up to 50 previous states
- **Redo Stack**: Cleared when new action performed
- **Actions Tracked**: Add, delete, move, resize, rotate, property changes

### Auto-Fit Algorithm

The auto-fit feature:
1. Calculates bounding box of all tables
2. Determines optimal zoom level to fit viewport
3. Centers the layout with equal padding
4. Smoothly animates to final position

**Technical Details:** See `client/src/modules/floor-plan/hooks/useFloorPlanLayout.ts`

### Table Types

Each type has specific rendering:

- **Circle**: Rendered as SVG circle, fixed aspect ratio
- **Rectangle**: Flexible width/height ratio
- **Square**: Locked aspect ratio (1:1)
- **Chip Monkey**: Custom SVG icon for decoration

## Related Documentation

- [Getting Started Guide](../../tutorials/GETTING_STARTED.md)
- [API Reference](../../reference/api/README.md)
- [WebSocket Events](../../reference/api/WEBSOCKET_EVENTS.md)
- [Database Schema - Tables](../../reference/schema/DATABASE.md#tables)

## Implementation Files

For developers:

- **Editor Component**: `client/src/modules/floor-plan/components/FloorPlanEditor.tsx`
- **Hooks**: `client/src/modules/floor-plan/hooks/`
  - `useTableManagement.ts` - CRUD operations
  - `useCanvasControls.ts` - Zoom, pan, grid
  - `useFloorPlanLayout.ts` - Auto-fit, centering
- **Persistence**: `client/src/modules/floor-plan/services/TablePersistenceService.ts`
- **API Service**: `client/src/services/tables/TableService.ts`
- **Types**: `client/src/modules/floor-plan/types/index.ts`

## Support

For issues or feature requests:
1. Check [Troubleshooting](#troubleshooting) section above
2. Review implementation files for technical details
3. Contact development team with specific error messages

---

*This documentation reflects Floor Plan Editor as of November 2025. Features and UI may evolve.*
