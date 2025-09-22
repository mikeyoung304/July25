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
        
        // Try to query known tables directly
        const knownTables = ['orders', 'menu_items', 'order_items', 'restaurants'];
        
        for (const tableName of knownTables) {
          
          try {
            // Get a sample row to understand structure
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (error) {
            } else if (data && data.length > 0) {
              const columns = Object.keys(data[0]);
              columns.forEach(col => {
                const value = data[0][col];
                const type = value === null ? 'unknown' : typeof value === 'object' ? 'jsonb/json' : typeof value;
              });
              
              // Count rows
              const { count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });
            } else {
            }
          } catch (err) {
          }
        }
        
        // Special check for metadata columns
        
        const { data: orderSample, error: orderError } = await supabase
          .from('orders')
          .select('id, metadata')
          .limit(1);
        
        if (!orderError && orderSample && orderSample.length > 0) {
          if (orderSample[0].metadata) {
          } else {
          }
        }
        
        // Check for existing indexes
        
        // This might not work depending on permissions, but worth trying
        const { data: indexes, error: indexError } = await supabase
          .rpc('get_indexes', {})
          .single();
        
        if (indexError) {
        } else if (indexes) {
        }
        
      } else if (tableList) {
      }
    }
    
  } catch (error) {
    console.error('Error inspecting schema:', error);
  }
  
}

inspectSchema().then(() => process.exit(0));