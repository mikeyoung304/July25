#!/usr/bin/env tsx

/**
 * Fall Menu Seed Script for Grow Fresh
 * Created: September 15, 2025
 *
 * This script seeds the fall menu with slot-filling logic for voice ordering
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const restaurantId = process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fall Menu Data Structure
const FALL_MENU = {
  categories: [
    { slug: 'starters', name: 'Starters', display_order: 1 },
    { slug: 'nachos', name: 'Nachos', display_order: 2 },
    { slug: 'salads', name: 'Salads', display_order: 3 },
    { slug: 'sandwiches', name: 'Sandwiches', display_order: 4 },
    { slug: 'bowls', name: 'Bowls', display_order: 5 },
    { slug: 'vegan', name: 'Vegan', display_order: 6 },
    { slug: 'entrees', name: 'Entrées', display_order: 7 }
  ],

  // Global options referenced by items
  globals: {
    dressings: ['Vidalia Onion', 'Balsamic', 'Ranch', 'Greek', 'Honey Mustard', 'Apple Vinaigrette', 'Poppy-Seed'],
    sides: ['Dressing & Gravy', 'Mashed Sweet Potato', 'Broccoli with Cheese Sauce', 'Collards',
            'Roasted Rainbow Carrots', 'Yellow Rice', 'Black-Eyed Peas', 'Braised Cabbage',
            'Macaroni Salad', 'Apple Sauce', 'Side Salad'],
    breads: ['White', 'Wheat', 'Flatbread']
  },

  items: [
    // STARTERS
    {
      external_id: 'fall-sampler',
      name: 'Fall Sampler',
      category: 'starters',
      description: 'Seasonal sampler platter with pumpkin bread, honey butter, pickles, and sausage',
      price: 16.00,
      modifiers: {
        required: [],
        optional: ['no pickles', 'no sausage', 'extra honey butter', 'extra pumpkin bread']
      },
      aliases: ['sampler', 'fall platter', 'starter sampler']
    },
    {
      external_id: 'pumpkin-bread',
      name: 'Pumpkin Bread Basket',
      category: 'starters',
      description: 'Fresh baked pumpkin bread served warm with honey butter',
      price: 9.00,
      modifiers: {
        required: [],
        optional: ['honey butter on side', 'extra butter', 'warm it']
      },
      aliases: ['pumpkin bread', 'bread basket']
    },
    {
      external_id: 'cran-pecan-bites',
      name: 'Cranberry Pecan Goat Cheese Bites',
      category: 'starters',
      description: '6 bites with flatbread crackers',
      price: 10.00,
      modifiers: {
        required: [],
        optional: ['no pecans', 'extra flatbread', 'extra bites']
      },
      aliases: ['goat cheese bites', 'cranberry bites']
    },
    {
      external_id: 'eggplant-bites',
      name: 'Fried Eggplant Bites Basket',
      category: 'starters',
      description: 'Crispy fried eggplant served with ranch',
      price: 10.00,
      modifiers: {
        required: [],
        optional: ['no ranch', 'extra ranch', 'ranch on side']
      },
      aliases: ['eggplant bites', 'fried eggplant']
    },
    {
      external_id: 'sloppy-dip',
      name: 'Sloppy Dip with House Chips',
      category: 'starters',
      description: 'Warm dip with sloppy joe, rotel, and cheese served with chips',
      price: 10.00,
      modifiers: {
        required: [],
        optional: ['extra chips', 'no rotel', 'no sloppy joe', 'extra cheese']
      },
      aliases: ['sloppy dip', 'dip and chips']
    },

    // NACHOS
    {
      external_id: 'grow-nacho',
      name: 'Grow Nacho',
      category: 'nachos',
      description: 'Loaded nachos with your choice of protein',
      price: 14.00,
      modifiers: {
        required: [
          { slot: 'protein', prompt: 'Chicken or Sloppy Joe?', options: ['Chicken Breast', 'Sloppy Joe'] }
        ],
        optional: ['no pico', 'no sour cream', 'extra cheese', 'add jalapeños']
      },
      aliases: ['nachos', 'loaded nachos']
    },

    // SALADS
    {
      external_id: 'fall-salad',
      name: 'Fall Salad',
      category: 'salads',
      description: 'Mixed greens with seasonal toppings, pecans, and cranberries',
      price: 12.00,
      modifiers: {
        required: [
          { slot: 'dressing', prompt: 'Which dressing?', optionsFrom: 'dressings' },
          { slot: 'cheese', prompt: 'Feta, Blue, or Cheddar?', options: ['Feta', 'Blue', 'Cheddar'] }
        ],
        optional: ['no nuts', 'no cranberries', 'light dressing', 'dressing on side'],
        addons: [
          { name: 'Add Chicken', price: 4.00 },
          { name: 'Add Salmon', price: 6.00 }
        ]
      },
      aliases: ['fall salad', 'seasonal salad']
    },
    {
      external_id: 'greek-salad',
      name: 'Greek Salad',
      category: 'salads',
      description: 'Classic Greek with feta, olives, banana peppers, and Greek dressing',
      price: 12.00,
      modifiers: {
        required: [],
        optional: ['no onion', 'no olives', 'no banana peppers', 'dressing on side']
      },
      aliases: ['greek', 'greek salad']
    },
    {
      external_id: 'moms-chicken-salad',
      name: "Mom's Chicken Salad",
      category: 'salads',
      description: 'House-made chicken salad with grapes and pecans over greens',
      price: 13.00,
      modifiers: {
        required: [],
        optional: ['no pecans', 'no grapes', 'add dressing', 'extra chicken salad']
      },
      aliases: ['chicken salad plate', 'moms salad']
    },
    {
      external_id: 'grilled-chicken-salad',
      name: 'Grilled Chicken Salad',
      category: 'salads',
      description: 'Grilled chicken breast over mixed greens with bacon and cheddar',
      price: 14.00,
      modifiers: {
        required: [
          { slot: 'dressing', prompt: 'Which dressing?', optionsFrom: 'dressings' }
        ],
        optional: ['no bacon', 'no cheddar', 'dressing on side', 'add avocado']
      },
      aliases: ['grilled chicken', 'chicken salad']
    },
    {
      external_id: 'taco-salad',
      name: 'Sloppy Joe Taco Salad',
      category: 'salads',
      description: 'Taco salad with seasoned sloppy joe, chips, pico, and sour cream',
      price: 15.00,
      modifiers: {
        required: [],
        optional: ['no sour cream', 'no chips', 'no pico', 'extra cheese']
      },
      aliases: ['taco salad', 'sloppy joe salad']
    },

    // SANDWICHES
    {
      external_id: 'chicken-salad-sandwich',
      name: 'Chicken Salad Sandwich',
      category: 'sandwiches',
      description: 'House-made chicken salad on your choice of bread',
      price: 12.00,
      modifiers: {
        required: [
          { slot: 'bread', prompt: 'White, Wheat, or Flatbread?', options: ['White', 'Wheat', 'Flatbread'] },
          { slot: 'side', prompt: 'Which side?', optionsFrom: 'sides' }
        ],
        optional: ['toasted', 'no mayo', 'add cheese', 'no celery', 'no grapes', 'no pecans']
      },
      aliases: ['chicken salad sandwich']
    },
    {
      external_id: 'blt',
      name: 'BLT',
      category: 'sandwiches',
      description: 'Classic bacon, lettuce, and tomato sandwich',
      price: 12.00,
      modifiers: {
        required: [
          { slot: 'bread', prompt: 'White, Wheat, or Flatbread?', options: ['White', 'Wheat', 'Flatbread'] },
          { slot: 'side', prompt: 'Which side?', optionsFrom: 'sides' }
        ],
        optional: ['toasted', 'no mayo', 'add cheese', 'no bacon']
      },
      aliases: ['blt', 'bacon sandwich']
    },
    {
      external_id: 'sloppy-sliders',
      name: 'Sloppy Joe Sliders',
      category: 'sandwiches',
      description: '3 sloppy joe sliders with pickle',
      price: 15.00,
      modifiers: {
        required: [
          { slot: 'side', prompt: 'Which side?', optionsFrom: 'sides' }
        ],
        optional: ['extra sauce', 'no pickle', 'add cheese']
      },
      aliases: ['sliders', 'sloppy joe sliders', 'mini burgers']
    },

    // BOWLS
    {
      external_id: 'soul-bowl',
      name: 'Soul Bowl',
      category: 'bowls',
      description: 'Southern comfort bowl with collards, black-eyed peas, and cornbread',
      price: 14.00,
      modifiers: {
        required: [],
        optional: ['no sausage', 'no collards', 'extra cornbread']
      },
      aliases: ['soul bowl', 'comfort bowl']
    },
    {
      external_id: 'fajita-keto',
      name: 'Chicken Fajita Keto',
      category: 'bowls',
      description: 'Low-carb fajita bowl with chicken, peppers, onions, cheese, and sour cream',
      price: 14.00,
      modifiers: {
        required: [],
        optional: ['no onions', 'no peppers', 'no cheese', 'no sour cream', 'extra avocado'],
        addons: [
          { name: 'Add Chips', price: 1.00 },
          { name: 'Add Rice', price: 1.00 }
        ]
      },
      aliases: ['keto bowl', 'fajita bowl', 'chicken fajita']
    },
    {
      external_id: 'salmon-power',
      name: 'Salmon Power Bowl',
      category: 'bowls',
      description: 'Grilled salmon with quinoa, egg, avocado, and vegetables',
      price: 16.00,
      modifiers: {
        required: [],
        optional: ['no egg', 'no avocado', 'sauce on side', 'swap quinoa for rice']
      },
      aliases: ['salmon bowl', 'power bowl']
    },

    // VEGAN
    {
      external_id: 'veggie-spaghetti',
      name: 'Veggie Spaghetti',
      category: 'vegan',
      description: 'Spaghetti with sautéed vegetables in marinara (vegan)',
      price: 15.00,
      modifiers: {
        required: [],
        optional: ['no onions', 'no peppers', 'no mushrooms'],
        addons: [
          { name: 'Make it Vegetarian (add Parmesan + Garlic Bread)', price: 0.00 }
        ]
      },
      aliases: ['veggie pasta', 'vegan spaghetti']
    },
    {
      external_id: 'harvest-bowl',
      name: 'Fall Harvest Vegan Bowl',
      category: 'vegan',
      description: 'Seasonal vegetables with maple balsamic dressing',
      price: 15.00,
      modifiers: {
        required: [],
        optional: ['dressing on side', 'no pecans', 'no cranberries', 'extra broccoli']
      },
      aliases: ['harvest bowl', 'vegan bowl']
    },

    // ENTREES (all require 2 sides)
    {
      external_id: 'chicken-dressing',
      name: 'Chicken & Dressing',
      category: 'entrees',
      description: 'Roasted chicken with cornbread dressing and gravy',
      price: 16.00,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' }
        ],
        optional: ['gravy on side', 'no cranberry sauce', 'extra dressing']
      },
      aliases: ['chicken and dressing']
    },
    {
      external_id: 'chicken-parm',
      name: 'Chicken Parmesan',
      category: 'entrees',
      description: 'Breaded chicken with marinara and mozzarella over spaghetti',
      price: 16.00,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' }
        ],
        optional: ['sauce on side', 'no mozzarella', 'extra parmesan', 'no garlic bread']
      },
      aliases: ['chicken parm', 'chicken parmesan']
    },
    {
      external_id: 'eggplant-parm',
      name: 'Eggplant Parmesan',
      category: 'entrees',
      description: 'Breaded eggplant with marinara and mozzarella',
      price: 15.00,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' }
        ],
        optional: ['sauce on side', 'no mozzarella', 'extra parmesan', 'no garlic bread']
      },
      aliases: ['eggplant parm', 'eggplant parmesan']
    },
    {
      external_id: 'hamburger-steak',
      name: 'Hamburger Steak',
      category: 'entrees',
      description: 'Seasoned hamburger steak with gravy over rice',
      price: 16.00,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' }
        ],
        optional: ['no gravy', 'no rice', 'add onions']
      },
      aliases: ['hamburger steak', 'salisbury steak']
    },
    {
      external_id: 'teriyaki-salmon',
      name: 'Teriyaki Salmon',
      category: 'entrees',
      description: 'Grilled salmon with teriyaki glaze over rice',
      price: 16.00,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' }
        ],
        optional: ['sauce on side', 'no rice']
      },
      aliases: ['salmon', 'teriyaki salmon']
    },
    {
      external_id: 'veggie-plate-3',
      name: 'Veggie Plate (3 sides)',
      category: 'entrees',
      description: 'Choose 3 sides',
      price: 10.00,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' },
          { slot: 'side3', prompt: 'Third side?', optionsFrom: 'sides' }
        ],
        optional: ['double up on a side']
      },
      aliases: ['veggie plate', '3 sides', 'sides plate']
    },
    {
      external_id: 'veggie-plate-4',
      name: 'Veggie Plate (4 sides)',
      category: 'entrees',
      description: 'Choose 4 sides',
      price: 12.50,
      modifiers: {
        required: [
          { slot: 'side1', prompt: 'First side?', optionsFrom: 'sides' },
          { slot: 'side2', prompt: 'Second side?', optionsFrom: 'sides' },
          { slot: 'side3', prompt: 'Third side?', optionsFrom: 'sides' },
          { slot: 'side4', prompt: 'Fourth side?', optionsFrom: 'sides' }
        ],
        optional: ['double up on a side']
      },
      aliases: ['veggie plate', '4 sides', 'sides plate']
    }
  ]
};

async function seedFallMenu() {
  console.log('🍂 Starting Fall Menu seed...');

  try {
    // 1. Clear existing menu items for this restaurant
    console.log('🧹 Clearing existing menu...');
    await supabase
      .from('menu_items')
      .delete()
      .eq('restaurant_id', restaurantId);

    await supabase
      .from('menu_categories')
      .delete()
      .eq('restaurant_id', restaurantId);

    // 2. Insert categories
    console.log('📁 Creating categories...');
    const categoryData = FALL_MENU.categories.map(cat => ({
      restaurant_id: restaurantId,
      name: cat.name,
      slug: cat.slug,
      display_order: cat.display_order,
      active: true
    }));

    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .insert(categoryData)
      .select();

    if (catError) throw catError;
    console.log(`✅ Created ${categories.length} categories`);

    // Create category map
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.slug, cat.id);
    });

    // 3. Insert menu items
    console.log('🍽️ Creating menu items...');
    const itemsToInsert = FALL_MENU.items.map(item => {
      // Transform modifiers to array format
      const modifierArray = [];

      // Add required modifiers
      if (item.modifiers?.required) {
        item.modifiers.required.forEach(req => {
          if (req.options) {
            req.options.forEach(opt => {
              modifierArray.push({
                name: opt,
                price: 0,
                group: req.slot,
                required: true
              });
            });
          }
        });
      }

      // Add optional modifiers
      if (item.modifiers?.optional) {
        item.modifiers.optional.forEach(mod => {
          modifierArray.push({
            name: mod,
            price: 0,
            required: false
          });
        });
      }

      // Add addons
      if (item.modifiers?.addons) {
        item.modifiers.addons.forEach(addon => {
          modifierArray.push({
            name: addon.name,
            price: addon.price || 0,
            required: false
          });
        });
      }

      return {
        restaurant_id: restaurantId,
        category_id: categoryMap.get(item.category),
        external_id: item.external_id,
        name: item.name,
        description: item.description,
        price: item.price,
        active: true,
        available: true,
        aliases: item.aliases || [],
        modifiers: modifierArray,
        dietary_flags: [],
        prep_time_minutes: 15
      };
    });

    const { data: items, error: itemError } = await supabase
      .from('menu_items')
      .insert(itemsToInsert)
      .select();

    if (itemError) throw itemError;
    console.log(`✅ Created ${items.length} menu items`);

    console.log('🎉 Fall menu seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Categories: ${categories.length}`);
    console.log(`  - Menu Items: ${items.length}`);
    console.log(`  - Restaurant ID: ${restaurantId}`);

  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    process.exit(1);
  }
}

// Run the seed
seedFallMenu().then(() => {
  console.log('\n✨ Done! Your fall menu is ready for voice ordering.');
  process.exit(0);
});