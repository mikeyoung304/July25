const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xiwfhcikfdoshxwbtjxt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRestaurants() {
  console.log('Checking for test restaurants...\n');
  
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, created_at')
    .in('id', ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']);
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  if (data.length === 0) {
    console.log('⚠️  No test restaurants found. Need to create them.');
    console.log('\nAttempting to create test restaurants...\n');
    
    const restaurants = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Test Restaurant A' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Test Restaurant B' }
    ];
    
    for (const restaurant of restaurants) {
      const { data: created, error: createError } = await supabase
        .from('restaurants')
        .insert(restaurant)
        .select();
      
      if (createError) {
        console.error(`❌ Failed to create ${restaurant.name}:`, createError.message);
      } else {
        console.log(`✅ Created ${restaurant.name}`);
      }
    }
  } else {
    console.log(`✅ Found ${data.length} test restaurant(s):\n`);
    data.forEach(r => {
      console.log(`   - ${r.name} (${r.id})`);
    });
  }
}

checkRestaurants().catch(console.error);
