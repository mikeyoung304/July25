import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const RESTAURANT_ID = process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

const GROW_FRESH_DATA = {
  restaurant: {
    id: RESTAURANT_ID,
    name: 'Grow Fresh Local Food',
    slug: 'grow-fresh-macon',
    timezone: 'America/New_York',
    settings: {
      address: 'Macon, GA',
      phone: '(478) 555-0123',
      hours: {
        monday: '11am-9pm',
        tuesday: '11am-9pm',
        wednesday: '11am-9pm',
        thursday: '11am-9pm',
        friday: '11am-10pm',
        saturday: '11am-10pm',
        sunday: '12pm-8pm'
      }
    }
  },
  categories: [
    { name: 'Starters', slug: 'starters', display_order: 1 },
    { name: 'Salads', slug: 'salads', display_order: 2 },
    { name: 'Bowls', slug: 'bowls', display_order: 3 },
    { name: 'Entrees', slug: 'entrees', display_order: 4 },
    { name: 'Sides', slug: 'sides', display_order: 5 },
    { name: 'Veggie Plate', slug: 'veggie-plate', display_order: 6 }
  ],
  items: [
    // STARTERS
    {
      name: 'Summer Sampler',
      category: 'starters',
      description: 'GA Made Sausage, Jalapeño Pimento Cheese Bites, Tomato Tea Sandwich, House Pickles, Fruit, Flatbread',
      price: 16.00,
      image_url: '/images/menu/summer-sampler.jpeg',
      aliases: ['sampler', 'sampler plate', 'appetizer sampler'],
      prep_time_minutes: 10
    },
    {
      name: 'Peach & Prosciutto Caprese',
      category: 'starters',
      description: 'Fresh peaches with prosciutto and mozzarella',
      price: 12.00,
      aliases: ['peach and prosciutto', 'caprese', 'peach salad'],
      prep_time_minutes: 8
    },
    {
      name: 'Watermelon Tataki',
      category: 'starters',
      description: 'Seared watermelon with Asian-inspired flavors',
      price: 12.00,
      image_url: '/images/menu/watermelon-tataki.jpeg',
      aliases: ['watermelon', 'tataki'],
      dietary_flags: ['vegetarian', 'vegan'],
      prep_time_minutes: 8
    },
    {
      name: 'Tea Sandwiches',
      category: 'starters',
      description: 'Assorted finger sandwiches',
      price: 10.00,
      aliases: ['tea sandwich', 'finger sandwiches'],
      prep_time_minutes: 6
    },
    {
      name: 'Jalapeño Pimento Bites',
      category: 'starters',
      description: 'Spicy pimento cheese bites',
      price: 10.00,
      image_url: '/images/menu/pimento-cheese.jpeg',
      aliases: ['pimento bites', 'jalapeno bites', 'pimento cheese'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    
    // SALADS
    {
      name: 'Summer Salad',
      category: 'salads',
      description: 'Seasonal greens with fresh summer produce',
      price: 12.00,
      aliases: ['house salad', 'seasonal salad'],
      dietary_flags: ['vegetarian'],
      modifiers: [
        { name: 'Add Chicken', price: 4.00 },
        { name: 'Add Salmon', price: 6.00 }
      ],
      prep_time_minutes: 5
    },
    {
      name: 'Peach Arugula Salad',
      category: 'salads',
      description: 'Fresh peaches with peppery arugula',
      price: 12.00,
      image_url: '/images/menu/peach-arugula-salad.jpeg',
      aliases: ['peach salad', 'arugula salad'],
      dietary_flags: ['vegetarian'],
      modifiers: [
        { name: 'Add Prosciutto', price: 4.00 }
      ],
      prep_time_minutes: 5
    },
    {
      name: 'Greek Salad',
      category: 'salads',
      description: 'Traditional Greek salad with feta and olives',
      price: 12.00,
      image_url: '/images/menu/greek-salad.jpeg',
      aliases: ['mediterranean salad'],
      dietary_flags: ['vegetarian'],
      modifiers: [
        { name: 'Add Chicken', price: 4.00 },
        { name: 'Add Salmon', price: 6.00 }
      ],
      prep_time_minutes: 5
    },
    {
      name: 'Tuna Salad',
      category: 'salads',
      description: 'House-made tuna salad on fresh greens',
      price: 14.00,
      aliases: ['tuna', 'tuna plate'],
      prep_time_minutes: 5
    },
    {
      name: "Mom's Chicken Salad",
      category: 'salads',
      description: 'Family recipe chicken salad',
      price: 13.00,
      image_url: '/images/menu/moms-chicken-salad.jpeg',
      aliases: ['mama salad', 'chicken salad', 'mom salad', 'mama chicken'],
      prep_time_minutes: 5
    },
    {
      name: 'Grilled Chicken Salad',
      category: 'salads',
      description: 'Grilled chicken breast on mixed greens',
      price: 14.00,
      aliases: ['grilled chicken', 'chicken breast salad'],
      prep_time_minutes: 8
    },
    
    // BOWLS - Most popular for voice ordering
    {
      name: 'Soul Bowl',
      category: 'bowls',
      description: 'GA made Smoked Sausage, Collards, Black-Eyed Peas, Rice, Pico De Gallo, Cornbread',
      price: 14.00,
      image_url: '/images/menu/soul-bowl.jpeg',
      aliases: ['georgia soul', 'soul food bowl', 'sausage bowl', 'collard bowl'],
      modifiers: [
        { name: 'No Rice', price: 0 },
        { name: 'Extra Collards', price: 2.00 }
      ],
      prep_time_minutes: 12
    },
    {
      name: 'Chicken Fajita Keto',
      category: 'bowls',
      description: 'Keto-friendly chicken fajita bowl',
      price: 14.00,
      aliases: ['fajita bowl', 'keto bowl', 'chicken fajita', 'keto chicken'],
      dietary_flags: ['keto'],
      modifiers: [
        { name: 'Add Rice', price: 1.00 }
      ],
      prep_time_minutes: 10
    },
    {
      name: 'Greek Bowl',
      category: 'bowls',
      description: 'Marinated Chicken Thigh, Couscous, Cucumber Salad, Feta, Olives, Naan, Tzatziki Sauce',
      price: 14.00,
      image_url: '/images/menu/greek-bowl.jpeg',
      aliases: ['greek chicken', 'mediterranean bowl', 'greek chicken bowl'],
      modifiers: [
        { name: 'No Olives', price: 0 },
        { name: 'No Feta', price: 0 }
      ],
      prep_time_minutes: 10
    },
    {
      name: 'Summer Vegan Bowl',
      category: 'bowls',
      description: 'Cold vegan bowl with fresh summer vegetables',
      price: 14.00,
      aliases: ['vegan bowl', 'cold vegan', 'vegan option'],
      dietary_flags: ['vegan'],
      prep_time_minutes: 8
    },
    {
      name: 'Summer Succotash',
      category: 'bowls',
      description: 'Hot vegan succotash bowl',
      price: 14.00,
      aliases: ['succotash', 'hot vegan', 'succotash bowl'],
      dietary_flags: ['vegan'],
      prep_time_minutes: 10
    },
    
    // ENTREES
    {
      name: 'Peach Chicken',
      category: 'entrees',
      description: 'Chicken with peach glaze',
      price: 16.00,
      aliases: ['chicken with peaches', 'peach glazed chicken'],
      prep_time_minutes: 15
    },
    {
      name: 'Teriyaki Salmon Over Rice',
      category: 'entrees',
      description: 'Glazed salmon served over rice',
      price: 16.00,
      image_url: '/images/menu/teriyaki-salmon.jpeg',
      aliases: ['salmon', 'salmon over rice', 'salmon rice'],
      prep_time_minutes: 12
    },
    {
      name: 'Hamburger Steak over rice',
      category: 'entrees',
      description: 'Southern-style hamburger steak with gravy over rice',
      price: 15.00,
      aliases: ['burger steak', 'salisbury steak', 'steak over rice'],
      prep_time_minutes: 15
    },
    {
      name: 'Greek Chicken Thighs (2) Over Rice',
      category: 'entrees',
      description: 'Two marinated Greek chicken thighs served over rice',
      price: 16.00,
      aliases: ['greek thighs', 'chicken thighs', 'greek chicken over rice'],
      prep_time_minutes: 15
    },
    
    // SIDES
    {
      name: 'Potatoes Romanoff',
      category: 'sides',
      price: 4.00,
      aliases: ['romanoff', 'potato romanoff', 'creamy potatoes'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      name: 'Black Eyed Peas',
      category: 'sides',
      price: 4.00,
      aliases: ['black eye peas', 'peas', 'field peas'],
      dietary_flags: ['vegan'],
      prep_time_minutes: 5
    },
    {
      name: 'Collards',
      category: 'sides',
      price: 4.00,
      aliases: ['collard greens', 'greens'],
      prep_time_minutes: 5
    },
    {
      name: 'Sweet Potatoes',
      category: 'sides',
      price: 4.00,
      aliases: ['sweet potato', 'yams'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      name: 'Rice',
      category: 'sides',
      price: 3.00,
      aliases: ['white rice', 'steamed rice'],
      dietary_flags: ['vegan'],
      prep_time_minutes: 3
    },
    {
      name: 'Potato Salad',
      category: 'sides',
      price: 4.00,
      aliases: ['tater salad'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 3
    },
    {
      name: 'Fruit Cup',
      category: 'sides',
      price: 4.00,
      aliases: ['fruit', 'fresh fruit'],
      dietary_flags: ['vegan'],
      prep_time_minutes: 3
    },
    {
      name: 'Cucumber Salad',
      category: 'sides',
      price: 4.00,
      aliases: ['cucumber', 'cucumbers'],
      dietary_flags: ['vegan'],
      prep_time_minutes: 3
    },
    {
      name: 'Side Salad',
      category: 'sides',
      price: 4.00,
      aliases: ['small salad', 'garden salad'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 3
    },
    {
      name: 'Peanut Asian Noodles',
      category: 'sides',
      price: 4.00,
      aliases: ['asian noodles', 'peanut noodles', 'noodles'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    
    // VEGGIE PLATE
    {
      name: 'Veggie Plate',
      category: 'veggie-plate',
      description: 'Choose 3 or 4 sides',
      price: 10.00,
      aliases: ['vegetable plate', 'veggie platter', 'vegetarian plate'],
      dietary_flags: ['vegetarian'],
      modifiers: [
        { name: 'Three Sides', price: 0 },
        { name: 'Four Sides', price: 2.50 }
      ],
      prep_time_minutes: 8
    }
  ]
};

async function seedMenu() {
  console.log('🌱 Seeding Grow Fresh Local Food menu...');
  console.log('📍 Restaurant ID:', RESTAURANT_ID);
  
  try {
    // Insert or update restaurant
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .upsert({
        id: GROW_FRESH_DATA.restaurant.id,
        name: GROW_FRESH_DATA.restaurant.name,
        slug: GROW_FRESH_DATA.restaurant.slug,
        timezone: GROW_FRESH_DATA.restaurant.timezone,
        settings: GROW_FRESH_DATA.restaurant.settings,
        active: true
      });
    
    if (restaurantError) {
      console.error('❌ Failed to create restaurant:', restaurantError);
      throw restaurantError;
    }
    console.log('✅ Restaurant created/updated');
    
    // Insert categories
    for (const category of GROW_FRESH_DATA.categories) {
      const { error } = await supabase
        .from('menu_categories')
        .upsert({
          restaurant_id: RESTAURANT_ID,
          name: category.name,
          slug: category.slug,
          display_order: category.display_order,
          active: true
        }, {
          onConflict: 'restaurant_id,slug'
        });
      
      if (error) {
        console.error(`❌ Failed to create category ${category.name}:`, error);
        throw error;
      }
    }
    console.log('✅ Categories created');
    
    // Get category mappings
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id, slug')
      .eq('restaurant_id', RESTAURANT_ID);
    
    if (catError) throw catError;
    
    const categoryMap = new Map(
      categories?.map(cat => [cat.slug, cat.id]) || []
    );
    
    // Insert menu items
    let itemCount = 0;
    for (const item of GROW_FRESH_DATA.items) {
      const categoryId = categoryMap.get(item.category);
      if (!categoryId) {
        console.error(`❌ Category not found: ${item.category}`);
        continue;
      }
      
      const { error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: RESTAURANT_ID,
          category_id: categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          active: true,
          available: true,
          dietary_flags: item.dietary_flags || [],
          modifiers: item.modifiers || [],
          aliases: item.aliases || [],
          prep_time_minutes: item.prep_time_minutes || 10
        });
      
      if (error) {
        console.error(`❌ Failed to create item ${item.name}:`, error);
        throw error;
      }
      itemCount++;
    }
    
    console.log(`✅ ${itemCount} menu items created`);
    console.log('\n🎉 Menu seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Restaurant: ${GROW_FRESH_DATA.restaurant.name}`);
    console.log(`   - Categories: ${GROW_FRESH_DATA.categories.length}`);
    console.log(`   - Menu Items: ${itemCount}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedMenu()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });