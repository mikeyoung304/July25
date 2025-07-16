# Floor Plan Setup Instructions

## Clear Existing Mock Data

1. Make sure your development server is running:
   ```bash
   npm run dev
   ```

2. To clear existing tables, you have two options:
   - **Via UI**: In the Floor Plan editor, select tables and delete them using the Delete key or trash button
   - **Fresh Start**: Stop the server (Ctrl+C) and restart with `npm run dev` to reset to default mock data

## Create Your Custom Floor Plan

1. Go to the Admin section in your browser
2. Navigate to "Floor Plan" 
3. You'll now see an empty canvas
4. Use the toolbar to:
   - **Add Tables**: Click the circle, square, or rectangle buttons
   - **Select Tables**: Click on any table to select it
   - **Edit Properties**: Use the side panel to:
     - Change table names (e.g., "Table 1" to "Booth A")
     - Set number of seats
     - Adjust dimensions
     - Rotate tables
   - **Move Tables**: Drag tables to position them
   - **Delete Tables**: Select a table and press Delete key or use the trash button
   - **Save Layout**: Click "Save Layout" when done

## Tips for Grow Fresh Local Food Layout

Based on a typical restaurant layout, you might want to create:

- **Booths**: Use rectangles, name them "Booth 1", "Booth 2", etc.
- **Round Tables**: Use circles for 4-6 person tables
- **Bar Seating**: Use small squares in a row
- **Large Tables**: Use rectangles for communal/family tables

## Responsive Layout

The floor plan editor is now fully responsive:
- On desktop: Side panel shows on the right
- On tablet/mobile: Components stack vertically
- All controls remain accessible without zooming

## Troubleshooting

If save fails:
1. Check that the server is running on port 3001
2. Check browser console for errors
3. Ensure you have a restaurant context (you're logged in)