import dotenv from 'dotenv';
dotenv.config();

async function uploadMenuToAI() {
  console.log('📤 Uploading menu to AI Gateway...');
  
  try {
    // Fetch menu from our API
    const menuResponse = await fetch('http://localhost:3001/api/v1/menu');
    
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
    
    // Upload to AI Gateway
    const uploadResponse = await fetch('http://localhost:3002/upload-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.log('\n💡 Make sure all services are running:');
    console.log('   - Backend on http://localhost:3001');
    console.log('   - AI Gateway on http://localhost:3002');
  }
}

// Wait for services to be ready
console.log('⏳ Waiting 5 seconds for services to be ready...');
setTimeout(uploadMenuToAI, 5000);