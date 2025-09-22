import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { aiService } from '../src/services/ai.service';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function initializeMenuContext() {
  
  try {
    const restaurantId = process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';
    
    // Load menu from database and set AI context
    await aiService.syncMenuContext(restaurantId);
    
    // Get the loaded menu to verify
    const menu = aiService.getMenu();
    
    if (menu) {
      
      if (menu.menu?.length > 0) {
        menu.menu.slice(0, 5).forEach((item: any) => {
        });
      }
    } else {
    }
    
  } catch (error) {
    console.error('❌ Error initializing menu context:', error);
    process.exit(1);
  }
}

initializeMenuContext();