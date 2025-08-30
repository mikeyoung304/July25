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

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase Database Schema...\n');
  
  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables', {})
      .single();
    
    if (tablesError) {
      // Try alternative method - query information_schema
      const { data: tableList, error: tableListError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_type', ['BASE TABLE']);
      
      if (tableListError) {
        console.log('Could not query information_schema, trying direct table queries...\n');
        
        // Try to query known tables directly
        const knownTables = ['orders', 'menu_items', 'order_items', 'restaurants'];
        
        for (const tableName of knownTables) {
          console.log(`\n📋 Table: ${tableName}`);
          console.log('=' .repeat(50));
          
          try {
            // Get a sample row to understand structure
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (error) {
              console.log(`❌ Table not found or error: ${error.message}`);
            } else if (data && data.length > 0) {
              console.log('✅ Table exists');
              console.log('\nColumns found:');
              const columns = Object.keys(data[0]);
              columns.forEach(col => {
                const value = data[0][col];
                const type = value === null ? 'unknown' : typeof value === 'object' ? 'jsonb/json' : typeof value;
                console.log(`  - ${col}: ${type}`);
              });
              
              // Count rows
              const { count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });
              console.log(`\nRow count: ${count || 0}`);
            } else {
              console.log('✅ Table exists but is empty');
            }
          } catch (err) {
            console.log(`❌ Error querying ${tableName}: ${err.message}`);
          }
        }
        
        // Special check for metadata columns
        console.log('\n\n🔍 Checking for JSONB metadata fields...');
        console.log('=' .repeat(50));
        
        const { data: orderSample, error: orderError } = await supabase
          .from('orders')
          .select('id, metadata')
          .limit(1);
        
        if (!orderError && orderSample && orderSample.length > 0) {
          if (orderSample[0].metadata) {
            console.log('✅ Orders table has metadata JSONB field');
            console.log('Sample metadata structure:');
            console.log(JSON.stringify(orderSample[0].metadata, null, 2));
          } else {
            console.log('⚠️  Orders table exists but metadata is null/empty');
          }
        }
        
        // Check for existing indexes
        console.log('\n\n📊 Checking existing indexes...');
        console.log('=' .repeat(50));
        
        // This might not work depending on permissions, but worth trying
        const { data: indexes, error: indexError } = await supabase
          .rpc('get_indexes', {})
          .single();
        
        if (indexError) {
          console.log('⚠️  Cannot query indexes directly (permission issue or function not exists)');
          console.log('You may need to check indexes via Supabase dashboard or direct psql');
        } else if (indexes) {
          console.log('Existing indexes:', indexes);
        }
        
      } else if (tableList) {
        console.log('Tables found in database:');
        tableList.forEach(t => console.log(`  - ${t.table_name}`));
      }
    }
    
  } catch (error) {
    console.error('Error inspecting schema:', error);
  }
  
  console.log('\n\n✅ Schema inspection complete!');
  console.log('=' .repeat(50));
  console.log('Based on this information, we can create appropriate indexes.');
}

inspectSchema().then(() => process.exit(0));