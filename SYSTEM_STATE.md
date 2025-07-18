# System State Documentation

## Current Architecture State (July 2025)

### 🏗️ Core Architecture
- **Unified Backend**: Single Express.js server on port 3001
- **Database**: Supabase (PostgreSQL) cloud-hosted
- **Frontend**: React 18 + TypeScript + Vite
- **Multi-tenant**: Restaurant-based isolation via `restaurant_id`

### 🔄 Recent Changes

#### Online Ordering System
- Built complete customer-facing ordering interface
- Implemented modern food app UX (DoorDash/UberEats style)
- Added Grow Fresh Local Food real menu with pricing

#### ID Mapping System
- **Problem**: Database uses UUIDs, but voice/frontend need numeric IDs
- **Solution**: Created ID mapping service (`menu-id-mapper.ts`)
- **Implementation**: 
  - Numeric IDs stored in description field as `[ID:xxx]` (temporary)
  - Mapper converts between formats
  - Menu items use ranges: Beverages (101-199), Starters (201-299), etc.

### ⚠️ Known Issues & Tech Debt

#### Critical
1. **ID Storage Hack**: External IDs in description field - needs proper column
2. **Metrics Middleware**: Was intercepting all routes (fixed)
3. **Multiple Server Instances**: Zombie processes need cleanup

#### High Priority
1. **Frontend Hardcoded Menu**: Still using fallback data instead of API
2. **Voice Integration Incomplete**: Not connected to actual AI service
3. **No Integration Tests**: Order flow untested end-to-end

#### Medium Priority
1. **Missing Documentation**: Deployment process unclear
2. **Race Conditions**: ID mapper cache could serve stale data
3. **Performance**: Every menu request triggers ID mapping

### 🗺️ ID Mapping Reference

```
Beverages:    101-199
Starters:     201-299  
Salads:       301-399
Sandwiches:   401-499
Bowls:        501-599
Vegan:        601-699
Entrees:      701-799
```

### 📁 Key Files Modified

- `server/src/services/menu-id-mapper.ts` - ID conversion service
- `server/src/services/menu.service.ts` - Updated to use mapper
- `server/src/services/orders.service.ts` - Converts IDs on order creation
- `server/scripts/seed-menu-mapped.ts` - Seeds DB with ID mappings
- `client/src/modules/order-system/` - Complete ordering UI

### 🚀 Next Steps

1. **Refactor ID System**: Add proper `external_id` column to database
2. **Complete Voice Integration**: Connect to AI service
3. **Add Integration Tests**: Test full order flow
4. **Update Frontend**: Remove hardcoded menu data
5. **Performance Optimization**: Add caching layer for ID mappings

### 🔧 Development Notes

- Always run `npm test` before commits
- Use `npx tsx scripts/seed-menu-mapped.ts` to seed menu
- Check for zombie processes: `ps aux | grep tsx`
- Metrics available at `http://localhost:3001/metrics`

### 🐛 Debugging Tips

- If API returns metrics instead of JSON: Check metrics middleware config
- If IDs don't match: Check ID mapper cache, may need restart
- If menu empty: Run seed script, check Supabase connection

---
*Last Updated: July 18, 2025*