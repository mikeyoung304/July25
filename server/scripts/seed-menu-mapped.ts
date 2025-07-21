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

// This approach adds an external_id field to track our numeric IDs
// while letting the database use its native UUID for the primary key
const GROW_FRESH_DATA = {
  restaurant: {
    id: RESTAURANT_ID,
    name: 'Grow Fresh Local Food',
    slug: 'grow-fresh-macon',
    timezone: 'America/New_York',
    settings: {
      address: '1019 Riverside Dr, Macon, GA 31201',
      phone: '(478) 743-4663',
      hours: {
        monday: '11am-3pm',
        tuesday: '11am-3pm',
        wednesday: '11am-3pm',
        thursday: '11am-3pm',
        friday: '11am-3pm',
        saturday: 'Closed',
        sunday: 'Closed'
      }
    }
  },
  categories: [
    { name: 'Beverages', slug: 'beverages', display_order: 1 },
    { name: 'Starters', slug: 'starters', display_order: 2 },
    { name: 'Salads', slug: 'salads', display_order: 3 },
    { name: 'Sandwiches', slug: 'sandwiches', display_order: 4 },
    { name: 'Bowls', slug: 'bowls', display_order: 5 },
    { name: 'Vegan', slug: 'vegan', display_order: 6 },
    { name: 'Entrees', slug: 'entrees', display_order: 7 }
  ],
  items: [
    // BEVERAGES (101-199)
    {
      external_id: '101',
      name: 'Sweet Tea w. Lemon',
      category: 'beverages',
      description: 'Southern-style sweet tea with fresh lemon',
      price: 3.00,
      aliases: ['sweet tea', 'iced tea', 'tea'],
      prep_time_minutes: 1
    },
    {
      external_id: '102',
      name: 'Unsweet Tea w. Lemon',
      category: 'beverages',
      description: 'Fresh brewed tea with lemon',
      price: 3.00,
      aliases: ['unsweet tea', 'unsweetened tea', 'tea'],
      prep_time_minutes: 1
    },
    {
      external_id: '103',
      name: 'Lemonade',
      category: 'beverages',
      description: 'Fresh-squeezed lemonade',
      price: 3.00,
      aliases: ['lemon aid', 'fresh lemonade'],
      prep_time_minutes: 1
    },
    
    // STARTERS (201-299)
    {
      external_id: '201',
      name: 'Summer Sampler',
      category: 'starters',
      description: 'A selection of our favorite seasonal starters',
      price: 16.00,
      aliases: ['sampler', 'sampler plate', 'appetizer sampler'],
      prep_time_minutes: 10
    },
    {
      external_id: '202',
      name: 'Jalapeno Pimento Bites',
      category: 'starters',
      description: 'Spicy pimento cheese bites with fresh jalapeños',
      price: 10.00,
      aliases: ['pimento bites', 'jalapeno bites', 'pimento cheese'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      external_id: '203',
      name: 'Peach & Prosciutto Caprese',
      category: 'starters',
      description: 'Fresh Georgia peaches with prosciutto and mozzarella',
      price: 12.00,
      aliases: ['peach and prosciutto', 'caprese', 'peach salad'],
      prep_time_minutes: 8
    },
    {
      external_id: '204',
      name: 'Watermelon Tataki',
      category: 'starters',
      description: 'Fresh watermelon with a savory twist',
      price: 10.00,
      aliases: ['watermelon', 'tataki'],
      dietary_flags: ['vegetarian', 'vegan'],
      prep_time_minutes: 8
    },
    {
      external_id: '205',
      name: 'Tea Sandwiches',
      category: 'starters',
      description: 'Assorted finger sandwiches perfect for sharing',
      price: 10.00,
      aliases: ['tea sandwich', 'finger sandwiches'],
      prep_time_minutes: 6
    },
    
    // SALADS (301-399)
    {
      external_id: '301',
      name: 'Summer Salad',
      category: 'salads',
      description: 'Fresh seasonal greens with summer vegetables',
      price: 12.00,
      aliases: ['house salad', 'seasonal salad'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      external_id: '302',
      name: 'Greek Salad',
      category: 'salads',
      description: 'Crisp greens with feta, olives, and Greek dressing',
      price: 12.00,
      aliases: ['greek', 'mediterranean salad'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      external_id: '303',
      name: 'Peach Arugula Salad',
      category: 'salads',
      description: 'Peppery arugula with fresh Georgia peaches',
      price: 12.00,
      aliases: ['peach salad', 'arugula salad'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      external_id: '304',
      name: 'Tuna Salad',
      category: 'salads',
      description: 'House-made tuna salad on fresh greens',
      price: 14.00,
      aliases: ['tuna', 'tuna fish salad'],
      prep_time_minutes: 5
    },
    {
      external_id: '305',
      name: "Mom's Chicken Salad",
      category: 'salads',
      description: 'Traditional chicken salad with grapes and pecans',
      price: 13.00,
      aliases: ['moms chicken salad', 'chicken salad', 'mom chicken salad'],
      prep_time_minutes: 5
    },
    {
      external_id: '306',
      name: 'Grilled Chicken Salad',
      category: 'salads',
      description: 'Grilled chicken breast on mixed greens',
      price: 14.00,
      aliases: ['chicken salad', 'grilled chicken'],
      prep_time_minutes: 8
    },
    
    // SANDWICHES (401-499)
    {
      external_id: '401',
      name: 'Chicken Salad Sandwich',
      category: 'sandwiches',
      description: 'House-made chicken salad with lettuce and tomato',
      price: 12.00,
      aliases: ['chicken sandwich', 'chicken salad'],
      prep_time_minutes: 5
    },
    {
      external_id: '402',
      name: 'BLT Sandwich',
      category: 'sandwiches',
      description: 'Classic bacon, lettuce, and tomato',
      price: 12.00,
      aliases: ['blt', 'bacon lettuce tomato'],
      prep_time_minutes: 5
    },
    {
      external_id: '403',
      name: 'Tuna Salad Sandwich',
      category: 'sandwiches',
      description: 'Fresh tuna salad on your choice of bread',
      price: 12.00,
      aliases: ['tuna sandwich', 'tuna'],
      prep_time_minutes: 5
    },
    {
      external_id: '404',
      name: 'Jalapeno Pimento Cheese Sandwich',
      category: 'sandwiches',
      description: 'Spicy pimento cheese sandwich',
      price: 12.00,
      aliases: ['pimento cheese sandwich', 'pimento sandwich'],
      dietary_flags: ['vegetarian'],
      prep_time_minutes: 5
    },
    {
      external_id: '405',
      name: 'Chopped Italian Sandwich',
      category: 'sandwiches',
      description: 'Italian meats and cheeses with peppers and onions',
      price: 14.00,
      aliases: ['italian sandwich', 'italian sub', 'chopped italian'],
      prep_time_minutes: 6
    },
    
    // BOWLS (501-599)
    {
      external_id: '501',
      name: 'Soul Bowl',
      category: 'bowls',
      description: 'Georgia-made soul food with field peas, collards, and rice',
      price: 14.00,
      aliases: ['soul food bowl', 'southern bowl'],
      prep_time_minutes: 10
    },
    {
      external_id: '502',
      name: 'Chicken Fajita Keto Bowl',
      category: 'bowls',
      description: 'Grilled chicken with peppers and onions, keto-friendly',
      price: 14.00,
      aliases: ['fajita bowl', 'keto bowl', 'chicken fajita'],
      dietary_flags: ['keto'],
      prep_time_minutes: 10
    },
    {
      external_id: '503',
      name: 'Greek Bowl',
      category: 'bowls',
      description: 'Mediterranean flavors with chicken, feta, and olives',
      price: 14.00,
      aliases: ['greek', 'mediterranean bowl'],
      prep_time_minutes: 10
    },
    
    // VEGAN (601-699)
    {
      external_id: '601',
      name: 'Summer Vegan Bowl (Cold)',
      category: 'vegan',
      description: 'Fresh seasonal vegetables and grains',
      price: 14.00,
      aliases: ['vegan bowl', 'cold vegan bowl', 'veggie bowl'],
      dietary_flags: ['vegan', 'vegetarian'],
      prep_time_minutes: 8
    },
    {
      external_id: '602',
      name: 'Summer Succotash',
      category: 'vegan',
      description: 'Traditional Southern succotash, served hot',
      price: 10.00,
      aliases: ['succotash', 'hot succotash'],
      dietary_flags: ['vegan', 'vegetarian'],
      prep_time_minutes: 8
    },
    
    // ENTREES (701-799)
    {
      external_id: '701',
      name: 'Peach Chicken',
      category: 'entrees',
      description: 'Grilled chicken with Georgia peach glaze, served with 2 sides',
      price: 16.00,
      aliases: ['peach glazed chicken', 'chicken with peaches'],
      prep_time_minutes: 15
    },
    {
      external_id: '702',
      name: 'Teriyaki Salmon',
      category: 'entrees',
      description: 'Fresh salmon with teriyaki glaze, served with 2 sides',
      price: 16.00,
      aliases: ['salmon', 'teriyaki fish'],
      prep_time_minutes: 15
    },
    {
      external_id: '703',
      name: 'Hamburger Steak',
      category: 'entrees',
      description: 'Southern-style hamburger steak with gravy, served with 2 sides',
      price: 15.00,
      aliases: ['burger steak', 'salisbury steak'],
      prep_time_minutes: 15
    },
    {
      external_id: '704',
      name: 'Greek Chicken Thighs',
      category: 'entrees',
      description: '2 Greek-seasoned chicken thighs over rice',
      price: 15.00,
      aliases: ['greek chicken', 'chicken thighs'],
      prep_time_minutes: 15
    }
  ]
};

async function seedMenuMapped() {
  console.log('🌱 Seeding Grow Fresh Local Food menu with external ID mapping...');
  console.log('📍 Restaurant ID:', RESTAURANT_ID);
  
  try {
    // Clear existing data
    console.log('🗑️  Clearing existing menu data...');
    
    await supabase
      .from('menu_items')
      .delete()
      .eq('restaurant_id', RESTAURANT_ID);
    
    await supabase
      .from('menu_categories')
      .delete()
      .eq('restaurant_id', RESTAURANT_ID);
    
    // Insert restaurant if not exists
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .upsert({
        id: RESTAURANT_ID,
        ...GROW_FRESH_DATA.restaurant
      });
    
    if (restaurantError && !restaurantError.message.includes('duplicate')) {
      throw restaurantError;
    }
    
    // Insert categories (let database generate UUIDs)
    console.log('📁 Creating categories...');
    for (const category of GROW_FRESH_DATA.categories) {
      const { error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: RESTAURANT_ID,
          name: category.name,
          slug: category.slug,
          display_order: category.display_order
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to create category ${category.name}:`, error);
        throw error;
      }
    }
    console.log('✅ Categories created');
    
    // Get category mappings from database
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id, slug')
      .eq('restaurant_id', RESTAURANT_ID);
    
    if (catError) throw catError;
    
    const categoryMap = new Map(
      categories?.map(cat => [cat.slug, cat.id]) || []
    );
    
    // Insert menu items (let database generate UUIDs)
    console.log('🍔 Creating menu items...');
    let itemCount = 0;
    const itemIdMap = new Map<string, string>();
    
    for (const item of GROW_FRESH_DATA.items) {
      const categoryId = categoryMap.get(item.category);
      if (!categoryId) {
        console.error(`❌ Category not found: ${item.category}`);
        continue;
      }
      
      // Store external_id in description or a custom field if available
      // For now, we'll append it to the description
      const enhancedDescription = `${item.description} [ID:${item.external_id}]`;
      
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: RESTAURANT_ID,
          category_id: categoryId,
          name: item.name,
          description: enhancedDescription,
          price: item.price,
          active: true,
          available: true,
          dietary_flags: item.dietary_flags || [],
          modifiers: item.modifiers || [],
          aliases: item.aliases || [],
          prep_time_minutes: item.prep_time_minutes || 10
        })
        .select()
        .single();
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to create item ${item.name}:`, error);
        throw error;
      }
      
      if (data) {
        itemIdMap.set(item.external_id, data.id);
        console.log(`✅ Created ${item.name} - External ID: ${item.external_id} → UUID: ${data.id}`);
      }
      
      itemCount++;
    }
    
    console.log(`\n✅ ${itemCount} menu items created`);
    console.log('\n🎉 Menu seeded successfully with ID mapping!');
    console.log('\n📋 Summary:');
    console.log(`   - Restaurant: ${GROW_FRESH_DATA.restaurant.name}`);
    console.log(`   - Categories: ${GROW_FRESH_DATA.categories.length}`);
    console.log(`   - Menu Items: ${itemCount}`);
    console.log('\n🔢 ID Ranges:');
    console.log('   - Beverages: 101-199');
    console.log('   - Starters: 201-299');
    console.log('   - Salads: 301-399');
    console.log('   - Sandwiches: 401-499');
    console.log('   - Bowls: 501-599');
    console.log('   - Vegan: 601-699');
    console.log('   - Entrees: 701-799');
    console.log('\n💡 Note: External IDs are stored in descriptions as [ID:xxx]');
    console.log('   The frontend will need to parse these or we need a mapping service');
    
    // Save the mapping to a file for reference
    const mapping = {
      generated: new Date().toISOString(),
      restaurant_id: RESTAURANT_ID,
      items: Array.from(itemIdMap.entries()).map(([external_id, uuid]) => ({
        external_id,
        uuid,
        name: GROW_FRESH_DATA.items.find(i => i.external_id === external_id)?.name
      }))
    };
    
    console.log('\n📝 ID Mapping (for reference):');
    console.log(JSON.stringify(mapping, null, 2));
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedMenuMapped()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });