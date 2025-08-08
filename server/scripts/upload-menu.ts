import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function uploadMenuToAI() {
  console.log('📤 Uploading menu to AI Gateway...');
  
  try {
    // Fetch menu from our API
    const menuResponse = await fetch('http://localhost:3001/api/v1/menu', {
      headers: { 'x-restaurant-id': process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111' }
    });
    
    if (!menuResponse.ok) {
      throw new Error(`Failed to fetch menu: ${menuResponse.statusText}`);
    }
    
    const menuData = await menuResponse.json();
    
    // Transform for AI Gateway
    const aiMenu = {
      restaurant: "Grow Fresh Local Food",
      restaurantId: process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111',
      menu: menuData.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: menuData.categories.find((c: any) => c.id === item.categoryId)?.name || 'Other',
        modifiers: item.modifiers || []
      }))
    };
    
    console.log(`📊 Preparing to upload ${aiMenu.menu.length} items...`);
    
    // Upload to unified backend AI endpoint
    const uploadResponse = await fetch('http://localhost:3001/api/v1/ai/menu', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
        'x-restaurant-id': process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
      },
      body: JSON.stringify(aiMenu)
    });
    
    if (uploadResponse.ok) {
      console.log('✅ Menu uploaded successfully!');
      console.log(`📊 Uploaded ${aiMenu.menu.length} items`);
      console.log('\n📋 Categories:');
      const categories = [...new Set(aiMenu.menu.map((item: any) => item.category))];
      categories.forEach(cat => {
        const count = aiMenu.menu.filter((item: any) => item.category === cat).length;
        console.log(`   - ${cat}: ${count} items`);
      });
    } else {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload failed:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Make sure the unified backend is running:');
    console.log('   - Server on http://localhost:3001');
  }
}

// Wait for services to be ready
console.log('⏳ Waiting 5 seconds for services to be ready...');
setTimeout(uploadMenuToAI, 5000);