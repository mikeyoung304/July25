const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xiwfhcikfdoshxwbtjxt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchemaFixes() {
  console.log('Applying database schema fixes for floor plan...');
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('tables')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError);
      return;
    }
    
    console.log('✓ Connected to Supabase successfully');
    
    // Since we can't execute DDL directly, let's check if z_index column exists
    const { data: sampleData } = await supabase
      .from('tables')
      .select('*')
      .limit(1);
    
    if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      console.log('Current table columns:', columns);
      
      if (columns.includes('z_index')) {
        console.log('✓ z_index column already exists');
      } else {
        console.log('❌ z_index column missing - needs manual addition');
        console.log('Please run in Supabase SQL Editor:');
        console.log('ALTER TABLE tables ADD COLUMN z_index INTEGER DEFAULT 1;');
      }
      
      // Test shape constraint by trying to create a circle table
      console.log('Testing shape constraints...');
      const testTable = {
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        label: 'Test Circle',
        seats: 4,
        x_pos: 100,
        y_pos: 100,
        width: 80,
        height: 80,
        shape: 'circle',
        z_index: 1
      };
      
      const { data: createData, error: createError } = await supabase
        .from('tables')
        .insert(testTable)
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Shape constraint needs updating:', createError.message);
        console.log('Please run in Supabase SQL Editor:');
        console.log('ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;');
        console.log("ALTER TABLE tables ADD CONSTRAINT tables_shape_check CHECK (shape IN ('circle', 'square', 'rectangle'));");
      } else {
        console.log('✓ Shape constraints allow circle tables');
        // Clean up test table
        await supabase.from('tables').delete().eq('id', createData.id);
      }
    }
    
  } catch (error) {
    console.error('Error during schema verification:', error);
  }
}

applySchemaFixes();