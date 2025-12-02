import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Configurable restaurant ID: env var > CLI arg > default
const RESTAURANT_ID = process.env.SEED_RESTAURANT_ID || process.argv[2] || '11111111-1111-1111-1111-111111111111';

const GROW_FRESH_DATA = {
  categories: [
    { name: 'Starters', slug: 'starters', display_order: 1 },
    { name: 'Nachos', slug: 'nachos', display_order: 2 },
    { name: 'Salads', slug: 'salads', display_order: 3 },
    { name: 'Sandwiches', slug: 'sandwiches', display_order: 4 },
    { name: 'Bowls', slug: 'bowls', display_order: 5 },
    { name: 'Vegan', slug: 'vegan', display_order: 6 },
    { name: 'Entrees', slug: 'entrees', display_order: 7 },
    { name: 'Fresh Sides', slug: 'fresh-sides', display_order: 8 },
    { name: 'Beverages', slug: 'beverages', display_order: 9 }
  ],
  items: [
    {
      external_id: '101',
      name: 'Sweet Tea w. Lemon',
      category: 'beverages',
      description: 'Southern-style sweet tea with fresh lemon',
      price: 3.00,
      aliases: ['sweet tea', 'iced tea', 'tea'],
    },
    // KEEP ALL YOUR OTHER ITEMS HERE (unchanged)
  ]
};

async function main() {
  try {

    // 1. Categories
    const { data: existingCats } = await supabase
      .from('menu_categories')
      .select('id, slug')
      .eq('restaurant_id', RESTAURANT_ID);

    const existingSlugs = new Set((existingCats ?? []).map(c => c.slug));
    const categoriesToInsert = GROW_FRESH_DATA.categories
      .filter(c => !existingSlugs.has(c.slug))
      .map(c => ({
        restaurant_id: RESTAURANT_ID,
        name: c.name,
        slug: c.slug,
        display_order: c.display_order,
        active: true
      }));

    if (categoriesToInsert.length) {
      const { error } = await supabase.from('menu_categories').insert(categoriesToInsert);
      if (error) throw error;
    } else {
    }

    // refresh map
    const { data: cats, error: catsErr } = await supabase
      .from('menu_categories')
      .select('id, slug')
      .eq('restaurant_id', RESTAURANT_ID);
    if (catsErr) throw catsErr;

    const categoryMap = new Map<string, string>();
    (cats ?? []).forEach(c => categoryMap.set(c.slug, c.id));

    // 2. Items
    const { data: existingItems } = await supabase
      .from('menu_items')
      .select('external_id')
      .eq('restaurant_id', RESTAURANT_ID);
    const existingExternalIds = new Set((existingItems ?? []).map(i => i.external_id));

    let itemCount = 0;
    const itemIdMap = new Map<string, string>();

    for (const item of GROW_FRESH_DATA.items) {
      const categoryId = categoryMap.get(item.category);
      if (!categoryId) {
        console.error(`Category not found: ${item.category}`);
        continue;
      }

      if (existingExternalIds.has(item.external_id)) {
        continue;
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: RESTAURANT_ID,
          category_id: categoryId,
          external_id: item.external_id,
          name: item.name,
          description: item.description,
          price: item.price,
          aliases: item.aliases ?? [],
          active: true
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Failed to insert ${item.name}:`, error);
        continue;
      }

      itemCount++;
      itemIdMap.set(item.external_id, data.id);
    }

  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
}

main();
