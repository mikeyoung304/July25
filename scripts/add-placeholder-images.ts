import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// High-quality food images from Unsplash
// Using specific image IDs for consistent, beautiful placeholders
const imageMap: Record<string, string> = {
  // Beverages
  'Lemonade': 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&q=80', // Fresh lemonade
  'Unsweet Tea w. Lemon': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80', // Iced tea
  'Sweet Tea w. Lemon': 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=800&q=80', // Sweet tea
  
  // Starters
  'Summer Sampler': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800&q=80', // Appetizer platter
  'Jalapeno Pimento Bites': 'https://images.unsplash.com/photo-1607098665874-fd193397547b?w=800&q=80', // Stuffed peppers
  'Peach & Prosciutto Caprese': 'https://images.unsplash.com/photo-1608877907149-a206d75ba011?w=800&q=80', // Caprese
  'Watermelon Tataki': 'https://images.unsplash.com/photo-1587049332298-1c42e83937a7?w=800&q=80', // Watermelon dish
  'Tea Sandwiches': 'https://images.unsplash.com/photo-1528605105345-5344ea20e269?w=800&q=80', // Finger sandwiches
  
  // Salads
  'Grilled Chicken Salad': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80', // Chicken salad
  'Summer Salad': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', // Fresh salad
  'Greek Salad': 'https://images.unsplash.com/photo-1548811579-063b8792bac9?w=800&q=80', // Greek salad
  'Peach Arugula Salad': 'https://images.unsplash.com/photo-1573225342350-16731dd9bf83?w=800&q=80', // Arugula salad
  'Tuna Salad': 'https://images.unsplash.com/photo-1604497181015-76590d828b75?w=800&q=80', // Tuna salad
  "Mom's Chicken Salad": 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&q=80', // Classic chicken salad
  
  // Sandwiches
  'Chopped Italian Sandwich': 'https://images.unsplash.com/photo-1626078563385-7ea642d54ccc?w=800&q=80', // Italian sub
  'Chicken Salad Sandwich': 'https://images.unsplash.com/photo-1567234669037-d3b135cc00b8?w=800&q=80', // Chicken sandwich
  'BLT Sandwich': 'https://images.unsplash.com/photo-1619096252214-ef06c45683e3?w=800&q=80', // BLT
  'Tuna Salad Sandwich': 'https://images.unsplash.com/photo-1626074961596-cab914d79d86?w=800&q=80', // Tuna sandwich
  'Jalapeno Pimento Cheese Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80', // Grilled cheese
  
  // Bowls
  'Soul Bowl': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', // Comfort food bowl
  'Greek Bowl': 'https://images.unsplash.com/photo-1580013759032-c96505e24c1f?w=800&q=80', // Mediterranean bowl
  'Chicken Fajita Keto Bowl': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', // Mexican bowl
  
  // Vegan
  'Summer Vegan Bowl (Cold)': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', // Vegan bowl
  'Summer Succotash': 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&q=80', // Vegetable medley
  
  // Entrees
  'Teriyaki Salmon': 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=800&q=80', // Salmon dish
  'Hamburger Steak': 'https://images.unsplash.com/photo-1595777216528-071e0127ccbf?w=800&q=80', // Hamburger steak
  'Greek Chicken Thighs': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80', // Roasted chicken
  'Peach Chicken': 'https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=800&q=80', // Glazed chicken
};

async function updateMenuImages() {
  
  // Get all menu items
  const { data: items, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, name')
    .order('name');
    
  if (fetchError) {
    console.error('Error fetching items:', fetchError);
    return;
  }
  
  
  let updated = 0;
  let skipped = 0;
  
  for (const item of items || []) {
    const imageUrl = imageMap[item.name];
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ image_url: imageUrl })
        .eq('id', item.id);
        
      if (updateError) {
        console.error(`❌ Failed to update ${item.name}:`, updateError.message);
      } else {
        updated++;
      }
    } else {
      skipped++;
    }
  }
  
}

updateMenuImages().catch(console.error);