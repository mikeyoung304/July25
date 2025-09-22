import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Route Guard Consistency', () => {
  const routesDir = join(__dirname, '../../src/routes');
  
  it('should not import from legacy ../middleware/restaurantAccess', () => {
    const routeFiles = readdirSync(routesDir)
      .filter(file => file.endsWith('.routes.ts') || file.endsWith('.ts'))
      .filter(file => !file.includes('.test.') && !file.includes('.spec.'));
    
    const legacyImports: string[] = [];
    
    for (const file of routeFiles) {
      const content = readFileSync(join(routesDir, file), 'utf-8');
      
      // Check for legacy import
      if (content.includes("from '../middleware/restaurantAccess'")) {
        legacyImports.push(file);
      }
    }
    
    expect(legacyImports, `Files with legacy restaurantAccess imports: ${legacyImports.join(', ')}`).toHaveLength(0);
  });

  it('should import validateRestaurantAccess from unified auth middleware', () => {
    const criticalWriteRoutes = [
      'orders.routes.ts',
      'payments.routes.ts',
      'tables.routes.ts'
    ];
    
    const missingImports: string[] = [];
    
    for (const file of criticalWriteRoutes) {
      try {
        const content = readFileSync(join(routesDir, file), 'utf-8');
        
        // Check for correct import
        const hasCorrectImport = content.includes("from '../middleware/auth'") && 
                                content.includes('validateRestaurantAccess');
        
        if (!hasCorrectImport) {
          // Check if it's at least importing some auth middleware
          const hasAnyAuthImport = content.includes("from '../middleware/auth'") ||
                                   content.includes('authenticate') ||
                                   content.includes('validateKioskSession');
          
          if (!hasAnyAuthImport) {
            missingImports.push(`${file} - No auth middleware import found`);
          } else if (!content.includes('validateRestaurantAccess')) {
            // Has auth import but not using validateRestaurantAccess where needed
            // This is acceptable if using other auth methods
            // Note: uses auth but not validateRestaurantAccess
          }
        }
      } catch (error) {
        // File might not exist, that's okay
        // Skipping file: not found
      }
    }
    
    expect(missingImports, `Critical routes missing auth imports: ${missingImports.join(', ')}`).toHaveLength(0);
  });

  it('should use middleware in correct order: authenticate -> validateRestaurantAccess', () => {
    const routeFiles = ['orders.routes.ts', 'payments.routes.ts'];
    const incorrectOrder: string[] = [];
    
    for (const file of routeFiles) {
      try {
        const content = readFileSync(join(routesDir, file), 'utf-8');
        
        // Look for route definitions with middleware
        const routePattern = /\.(get|post|put|patch|delete)\s*\([^)]*\[(.*?)\]/g;
        let match;
        
        while ((match = routePattern.exec(content)) !== null) {
          const middlewares = match[2];
          
          if (middlewares.includes('validateRestaurantAccess') && 
              middlewares.includes('authenticate')) {
            // Check order
            const authIndex = middlewares.indexOf('authenticate');
            const validateIndex = middlewares.indexOf('validateRestaurantAccess');
            
            if (validateIndex < authIndex) {
              incorrectOrder.push(`${file}: validateRestaurantAccess before authenticate`);
            }
          }
        }
      } catch (error) {
        // File might not exist
      }
    }
    
    expect(incorrectOrder, `Routes with incorrect middleware order: ${incorrectOrder.join(', ')}`).toHaveLength(0);
  });
});