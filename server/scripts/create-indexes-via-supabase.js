const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Index definitions based on our schema inspection
const indexes = [
  // Orders table indexes
  {
    name: 'idx_orders_restaurant_status',
    table: 'orders',
    columns: ['restaurant_id', 'status'],
    description: 'Core query pattern for restaurant orders by status'
  },
  {
    name: 'idx_orders_restaurant_created',
    table: 'orders',
    columns: ['restaurant_id', 'created_at DESC'],
    description: 'Order history queries'
  },
  {
    name: 'idx_orders_status',
    table: 'orders',
    columns: ['status'],
    description: 'Status filtering'
  },
  {
    name: 'idx_orders_type',
    table: 'orders',
    columns: ['type'],
    description: 'Order type filtering'
  },
  {
    name: 'idx_orders_order_number',
    table: 'orders',
    columns: ['restaurant_id', 'order_number'],
    description: 'Order number lookup'
  },
  {
    name: 'idx_orders_customer_name',
    table: 'orders',
    columns: ['restaurant_id', 'customer_name'],
    where: 'customer_name IS NOT NULL',
    description: 'Customer name search'
  },
  {
    name: 'idx_orders_kds',
    table: 'orders',
    columns: ['restaurant_id', 'status', 'created_at DESC'],
    where: "status IN ('new', 'pending', 'confirmed', 'preparing', 'ready')",
    description: 'Kitchen Display System optimized'
  },
  // JSONB metadata indexes
  {
    name: 'idx_orders_metadata_payment_status',
    table: 'orders',
    columns: ["(metadata->>'payment_status')"],
    where: "metadata->>'payment_status' IS NOT NULL",
    description: 'Payment status in metadata'
  },
  {
    name: 'idx_orders_metadata_source',
    table: 'orders',
    columns: ["(metadata->>'source')"],
    where: "metadata->>'source' IS NOT NULL",
    description: 'Order source tracking'
  },
  {
    name: 'idx_orders_metadata_customer_email',
    table: 'orders',
    columns: ["(metadata->>'customer_email')"],
    where: "metadata->>'customer_email' IS NOT NULL",
    description: 'Customer email lookup'
  },
  // Menu items indexes
  {
    name: 'idx_menu_items_restaurant_available',
    table: 'menu_items',
    columns: ['restaurant_id', 'available'],
    where: 'available = true',
    description: 'Available menu items'
  },
  {
    name: 'idx_menu_items_restaurant_active',
    table: 'menu_items',
    columns: ['restaurant_id', 'active'],
    where: 'active = true',
    description: 'Active menu items'
  },
  {
    name: 'idx_menu_items_category',
    table: 'menu_items',
    columns: ['restaurant_id', 'category_id'],
    description: 'Category filtering'
  },
  {
    name: 'idx_menu_items_name',
    table: 'menu_items',
    columns: ['restaurant_id', 'name'],
    description: 'Menu item name search'
  },
  // Restaurants indexes
  {
    name: 'idx_restaurants_active',
    table: 'restaurants',
    columns: ['active'],
    where: 'active = true',
    description: 'Active restaurants'
  },
  {
    name: 'idx_restaurants_slug',
    table: 'restaurants',
    columns: ['slug'],
    where: 'slug IS NOT NULL',
    description: 'URL slug routing'
  }
];

async function createIndexes() {
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const index of indexes) {
    try {
      // Build the CREATE INDEX statement
      let sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.columns.join(', ')})`;
      
      if (index.where) {
        sql += ` WHERE ${index.where}`;
      }
      
      
      // Supabase doesn't allow DDL through client for security
      // Mark all for SQL script generation
      skippedCount++;
      
    } catch (err) {
      console.error(`   ❌ Unexpected error: ${err.message}`);
      errorCount++;
    }
  }
  
  // Since we can't create indexes directly via Supabase client,
  // generate a SQL script that can be run
  
  if (skippedCount > 0) {
    
    // Generate SQL script
    const sqlScript = indexes.map(index => {
      let sql = `CREATE INDEX IF NOT EXISTS ${index.name}\nON ${index.table}(${index.columns.join(', ')})`;
      if (index.where) {
        sql += `\nWHERE ${index.where}`;
      }
      sql += ';';
      return `-- ${index.description}\n${sql}`;
    }).join('\n\n');
    
    const fs = require('fs');
    const outputPath = path.join(__dirname, 'generated-indexes.sql');
    fs.writeFileSync(outputPath, `-- Auto-generated index creation script
-- Based on Supabase schema inspection
-- Run this via: psql $DATABASE_URL < server/scripts/generated-indexes.sql

${sqlScript}

-- Analyze tables for query optimization
ANALYZE orders;
ANALYZE menu_items;
ANALYZE restaurants;

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes ON indexrelname = indexname
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'restaurants')
ORDER BY tablename, indexname;
`);
    
  }
  
  // Test some queries to verify performance
  
  // Test 1: Kitchen display query
  const startTime1 = Date.now();
  const { data: kdsOrders, error: kdsError } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', '11111111-1111-1111-1111-111111111111')
    .in('status', ['new', 'pending', 'confirmed', 'preparing'])
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (!kdsError) {
  } else {
  }
  
  // Test 2: Payment status query
  const startTime2 = Date.now();
  const { data: pendingPayments, error: paymentError } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', '11111111-1111-1111-1111-111111111111')
    .eq('metadata->>payment_status', 'pending')
    .limit(10);
  
  if (!paymentError) {
  } else {
  }
  
  // Test 3: Available menu items
  const startTime3 = Date.now();
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', '11111111-1111-1111-1111-111111111111')
    .eq('available', true)
    .eq('active', true);
  
  if (!menuError) {
  } else {
  }
  
}

createIndexes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });