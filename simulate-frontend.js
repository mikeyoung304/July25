// Simulate frontend behavior to test menu loading
const API_BASE = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function simulateFrontendMenuLoading() {
  
  const headers = {
    'Content-Type': 'application/json',
    'x-restaurant-id': RESTAURANT_ID,
    'Authorization': 'Bearer test-token'
  };

  try {
    // Step 1: Load restaurant data (happens on CustomerOrderPage)
    const restaurantResponse = await fetch(`${API_BASE}/restaurants/${RESTAURANT_ID}`, {
      method: 'GET',
      headers
    });
    
    if (!restaurantResponse.ok) {
    } else {
      const restaurantData = await restaurantResponse.json();
    }

    // Step 2: Load menu categories (happens first in MenuService)
    const categoriesResponse = await fetch(`${API_BASE}/api/v1/menu/categories`, {
      method: 'GET',
      headers
    });
    
    if (!categoriesResponse.ok) {
      throw new Error(`Categories request failed: ${categoriesResponse.status}`);
    }
    
    const categoriesData = await categoriesResponse.json();

    // Step 3: Load menu items (happens in MenuService)
    const itemsResponse = await fetch(`${API_BASE}/api/v1/menu/items`, {
      method: 'GET',
      headers
    });
    
    if (!itemsResponse.ok) {
      throw new Error(`Items request failed: ${itemsResponse.status}`);
    }
    
    const itemsData = await itemsResponse.json();

    // Step 4: Transform items (simulate MenuService transformation)
    
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
    const categoryGroups = new Map();
    
    transformedItems.forEach(item => {
      const categoryName = item.category?.name || 'Other';
      if (!categoryGroups.has(categoryName)) {
        categoryGroups.set(categoryName, []);
      }
      categoryGroups.get(categoryName).push(item);
    });
    
    for (const [categoryName, items] of categoryGroups.entries()) {
    }
    
    // Step 6: Check for issues
    
    const itemsWithoutCategory = transformedItems.filter(item => !item.category?.name);
    if (itemsWithoutCategory.length > 0) {
    }
    
    const itemsWithoutImages = transformedItems.filter(item => !item.imageUrl);
    if (itemsWithoutImages.length > 0) {
    }
    
    const unavailableItems = transformedItems.filter(item => !item.isAvailable);
    

  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
  }
}

simulateFrontendMenuLoading();