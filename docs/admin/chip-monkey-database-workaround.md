# Chip Monkey Database Workaround

## Current Status

The Chip Monkey floor plan element is fully functional in the UI with:
- ✅ Brown color scheme (#92400E main color)
- ✅ Circular shape with monkey features
- ✅ Full resize support (maintains aspect ratio)
- ✅ Full rotate support
- ✅ Drag and drop
- ✅ Snap to grid
- ✅ Duplicate/delete

## Database Constraint

The Supabase database currently has a CHECK constraint limiting table shapes to:
- `circle`
- `square`  
- `rectangle`

## Temporary Workaround

Until the database constraint is updated, chip_monkey elements are stored as `circle` type in the database. The frontend detects and renders them correctly based on:
- Label containing "Chip Monkey"
- Size of 48x48
- 1 seat capacity

## Permanent Fix

To properly support `chip_monkey` in the database, run this SQL in the Supabase dashboard:

```sql
-- Drop the existing constraint
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;

-- Add new constraint including chip_monkey
ALTER TABLE tables ADD CONSTRAINT tables_shape_check 
  CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));
```

### Steps to Apply:
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Paste the SQL above
4. Click "Run"

## Frontend Detection Logic

The frontend will properly render chip_monkey if:
```javascript
// In FloorPlanCanvas.tsx
if (table.type === 'chip_monkey') {
  // Renders with brown colors and monkey features
}
```

## API Compatibility

The API accepts `type: 'chip_monkey'` but currently stores it as `circle` in the database due to the constraint. Once the migration is applied, it will store properly as `chip_monkey`.

## Testing

Test the chip_monkey functionality:
```bash
# Simple test (works with current workaround)
node test-chip-monkey-simple.js

# Full test (requires database migration)
node test-chip-monkey.js
```