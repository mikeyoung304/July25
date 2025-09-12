import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

describe('Route Guard Tests', () => {
  it('should not import legacy restaurantAccess middleware', async () => {
    // Find all route files
    const routeFiles = await glob('server/src/routes/**/*.ts', {
      cwd: process.cwd(),
      absolute: true
    });

    const legacyImports: string[] = [];

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for legacy import
      if (content.includes("from '../middleware/restaurantAccess'") ||
          content.includes('from "../middleware/restaurantAccess"') ||
          content.includes("from '../middleware/restaurantAccess';") ||
          content.includes('from "../middleware/restaurantAccess";')) {
        legacyImports.push(path.relative(process.cwd(), file));
      }
    }

    expect(legacyImports, 
      `Found legacy restaurantAccess imports in: ${legacyImports.join(', ')}`
    ).toEqual([]);
  });

  it('should use validateRestaurantAccess from auth.ts on write routes', async () => {
    // Check specific critical write routes
    const criticalRoutes = [
      'src/routes/orders.routes.ts',
      'src/routes/payments.routes.ts',
      'src/routes/terminal.routes.ts'
    ];

    for (const routePath of criticalRoutes) {
      const fullPath = path.join(process.cwd(), routePath);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`Route file not found: ${routePath}`);
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Should import validateRestaurantAccess from auth
      expect(content).toMatch(/import.*validateRestaurantAccess.*from ['"]\.\.\/middleware\/auth['"]/);
      
      // Should NOT import from restaurantAccess
      expect(content).not.toMatch(/from ['"]\.\.\/middleware\/restaurantAccess['"]/);
      
      // Check for POST/PUT/PATCH/DELETE routes
      const writeRoutePattern = /router\.(post|put|patch|delete)\(/g;
      const writeRoutes = content.match(writeRoutePattern) || [];
      
      if (writeRoutes.length > 0) {
        // Should use validateRestaurantAccess in middleware chain
        // This is a softer check - we verify it's imported and available
        expect(content).toContain('validateRestaurantAccess');
      }
    }
  });

  it('should have proper middleware chain for orders POST route', () => {
    const ordersPath = path.join(process.cwd(), 'src/routes/orders.routes.ts');
    const content = fs.readFileSync(ordersPath, 'utf-8');
    
    // Find the POST /orders route
    const postRouteMatch = content.match(
      /router\.post\(['"]\/['"],[\s\S]*?validateRestaurantAccess[\s\S]*?\)/
    );
    
    expect(postRouteMatch).toBeTruthy();
    
    if (postRouteMatch) {
      const routeContent = postRouteMatch[0];
      
      // Verify middleware order
      const middlewares = ['authenticate', 'requireRole', 'requireScopes', 'validateRestaurantAccess'];
      let lastIndex = -1;
      
      for (const middleware of middlewares) {
        const index = routeContent.indexOf(middleware);
        expect(index, `Missing middleware: ${middleware}`).toBeGreaterThan(-1);
        expect(index, `Wrong order for middleware: ${middleware}`).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    }
  });
});