import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xiwfhcikfdoshxwbtjxt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g'
);

console.log('Creating Test Restaurant B...\n');

const { data, error } = await supabase
  .from('restaurants')
  .insert({
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Test Restaurant Beta',
    slug: 'test-restaurant-beta',
    timezone: 'America/New_York',
    settings: {},
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select();

if (error) {
  console.error('❌ Error creating restaurant:', error.message);
  console.error('Details:', error);
  process.exit(1);
}

console.log('✅ Successfully created Test Restaurant B!');
console.log('   ID:', data[0].id);
console.log('   Name:', data[0].name);

console.log('\n✅ Multi-tenant test environment is now ready!\n');
console.log('Restaurant A: Grow Fresh Local Food (11111111...)');
console.log('Restaurant B: Test Restaurant Beta (22222222...)');
