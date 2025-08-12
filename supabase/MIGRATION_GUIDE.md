# Supabase Cloud Migration Guide

## Overview

This project uses **cloud-only Supabase** - no local database required!

## Quick Start

### First Time Setup
```bash
# 1. Login to Supabase (only needed once)
supabase login

# 2. Link to the cloud project
supabase link --project-ref xiwfhcikfdoshxwbtjxt

# 3. Pull the latest schema from cloud
supabase db pull

# 4. Start development
npm run dev
```

### Regular Development
```bash
# Just run the unified dev command
npm run dev
```

## Working with the Cloud Database

### Pull Latest Schema Changes
```bash
# Sync your local schema with cloud database
supabase db pull
```

### Make Schema Changes
1. Use the Supabase Dashboard to modify tables/schema
2. Or run SQL directly in the SQL Editor
3. Then pull changes locally:
   ```bash
   supabase db pull
   ```

### Generate TypeScript Types (Optional)
```bash
supabase gen types typescript --linked > database.types.ts
```

## Common Issues

### "Not logged in to Supabase"
Run `supabase login` and follow the browser prompt.

### "Project not linked"
The script will automatically link to project `xiwfhcikfdoshxwbtjxt`.

### "Migration failed"
1. Check the SQL syntax in your migration file
2. Look for error details in the terminal
3. You can always apply SQL manually in Supabase dashboard

## Cloud-First Best Practices

1. **Make changes in Supabase Dashboard**: Visual tools prevent SQL errors
2. **Use SQL Editor for complex changes**: Test queries before applying
3. **Pull changes immediately**: Keep local schema in sync
4. **Document major changes**: Update CHANGELOG.md for significant schema updates

## Project Structure
```
supabase/
├── config.toml          # Supabase configuration (for CLI)
├── migrations/          # Historical migrations (reference only)
└── MIGRATION_GUIDE.md   # This file
```

## Why Cloud-Only?

This approach simplifies development:
1. **No local database required**: Faster setup, less resource usage
2. **No local database sync issues**: Cloud is the single source of truth
3. **Team collaboration**: Everyone works with the same database
4. **Instant changes**: No migration files to manage or apply

## Testing with Cloud Database

### Test Data Management
```bash
# Use test restaurant data for development testing
# Restaurant ID: test-restaurant-123
# Test orders, menu items, and user data available in cloud DB
```

### Integration Tests
- **Database Tests**: Use cloud Supabase for integration tests
- **OpenAI Tests**: Always mock OpenAI service calls
- **Multi-tenant Tests**: Use test restaurant IDs for isolation
- **Data Cleanup**: Tests should not modify shared cloud data

### Test Restaurant Context
```typescript
// Always use test restaurant context in integration tests
const testRestaurantId = 'test-restaurant-123';

// Mock authenticated requests with test context
const mockReq = createMockAuthenticatedRequest({
  restaurantId: testRestaurantId,
  user: { id: 'test-user-456' }
});
```

### Database Test Patterns
```typescript
// Example: Testing order creation with cloud database
it('should create order in cloud database', async () => {
  const orderData = {
    items: [{ name: 'Test Item', quantity: 1, price: 9.99 }],
    restaurantId: 'test-restaurant-123',
    totalAmount: 9.99
  };

  const result = await orderService.createOrder(orderData);
  
  expect(result.restaurantId).toBe('test-restaurant-123');
  expect(result.status).toBe('created');
  
  // Cleanup test data if needed
  await orderService.deleteOrder(result.id);
});
```

### Testing Best Practices
- **Use test restaurant IDs**: Never test with production restaurant data
- **Mock OpenAI**: Database tests should not depend on AI service
- **Clean up test data**: Remove test orders/data after tests complete
- **Respect rate limits**: Cloud database has connection limits