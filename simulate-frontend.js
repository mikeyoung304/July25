// Simulate frontend behavior to test menu loading
const API_BASE = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function simulateFrontendMenuLoading() {
  console.log('🔄 Simulating frontend menu loading process...\n');
  
  const headers = {
    'Content-Type': 'application/json',
    'x-restaurant-id': RESTAURANT_ID,
    'Authorization': 'Bearer test-token'
  };

  try {
    // Step 1: Load restaurant data (happens on CustomerOrderPage)
    console.log('1️⃣ Loading restaurant data...');
    const restaurantResponse = await fetch(`${API_BASE}/restaurants/${RESTAURANT_ID}`, {
      method: 'GET',
      headers
    });
    
    if (!restaurantResponse.ok) {
      console.log('⚠️  Restaurant data not available (this might be OK)');
    } else {
      const restaurantData = await restaurantResponse.json();
      console.log('✅ Restaurant data loaded:', restaurantData.name);
    }

    // Step 2: Load menu categories (happens first in MenuService)
    console.log('\n2️⃣ Loading menu categories...');
    const categoriesResponse = await fetch(`${API_BASE}/api/v1/menu/categories`, {
      method: 'GET',
      headers
    });
    
    if (!categoriesResponse.ok) {
      throw new Error(`Categories request failed: ${categoriesResponse.status}`);
    }
    
    const categoriesData = await categoriesResponse.json();
    console.log('✅ Categories loaded:', categoriesData.length, 'categories');
    console.log('Category names:', categoriesData.map(c => c.name));

    // Step 3: Load menu items (happens in MenuService)
    console.log('\n3️⃣ Loading menu items...');
    const itemsResponse = await fetch(`${API_BASE}/api/v1/menu/items`, {
      method: 'GET',
      headers
    });
    
    if (!itemsResponse.ok) {
      throw new Error(`Items request failed: ${itemsResponse.status}`);
    }
    
    const itemsData = await itemsResponse.json();
    console.log('✅ Items loaded:', itemsData.length, 'items');

    // Step 4: Transform items (simulate MenuService transformation)
    console.log('\n4️⃣ Transforming items to frontend format...');
    
    const transformMenuItem = (item, categories) => {
      let category = undefined
      
      if (item.categoryId && categories) {
        const cat = categories.find(c => c.id === item.categoryId)
        category = cat ? { name: cat.name, id: cat.id } : undefined
      }

      return {
        id: item.id,
        categoryId: item.categoryId,
        category,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: item.available,
        dietaryFlags: item.dietaryFlags || [],
        preparationTime: item.prepTimeMinutes,
        modifiers: item.modifiers || [],
        aliases: item.aliases || []
      }
    };
    
    const transformedItems = itemsData.map(item => transformMenuItem(item, categoriesData));
    
    // Step 5: Group by categories (simulate MenuSections logic)
    console.log('\n5️⃣ Grouping items by categories...');
    const categoryGroups = new Map();
    
    transformedItems.forEach(item => {
      const categoryName = item.category?.name || 'Other';
      if (!categoryGroups.has(categoryName)) {
        categoryGroups.set(categoryName, []);
      }
      categoryGroups.get(categoryName).push(item);
    });
    
    console.log('✅ Menu sections created:');
    for (const [categoryName, items] of categoryGroups.entries()) {
      console.log(`  - ${categoryName}: ${items.length} items`);
    }
    
    // Step 6: Check for issues
    console.log('\n6️⃣ Checking for potential issues...');
    
    const itemsWithoutCategory = transformedItems.filter(item => !item.category?.name);
    if (itemsWithoutCategory.length > 0) {
      console.log('⚠️  Items without category:', itemsWithoutCategory.length);
      console.log('Sample:', itemsWithoutCategory.slice(0, 3).map(i => `${i.name} (${i.categoryId})`));
    }
    
    const itemsWithoutImages = transformedItems.filter(item => !item.imageUrl);
    if (itemsWithoutImages.length > 0) {
      console.log('⚠️  Items without images:', itemsWithoutImages.length);
    }
    
    const unavailableItems = transformedItems.filter(item => !item.isAvailable);
    console.log('ℹ️  Unavailable items:', unavailableItems.length);
    
    console.log('\n✅ Menu simulation completed successfully!');
    console.log(`📊 Summary: ${transformedItems.length} items in ${categoryGroups.size} categories`);

  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
  }
}

simulateFrontendMenuLoading();