import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xiwfhcikfdoshxwbtjxt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2ZoY2lrZmRvc2h4d2J0anh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI0OTMwMiwiZXhwIjoyMDY3ODI1MzAyfQ.-dXq_uGiXmBQRKTz22LBWya2YBqVXLgZ41oLTdhnB5g'
);

const { data, error } = await supabase.from('restaurants').select('id, name').limit(10);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`\nFound ${data.length} restaurant(s) in database:\n`);
data.forEach((r, i) => console.log(`${i+1}. ${r.name}\n   ID: ${r.id}\n`));

if (data.length >= 2) {
  console.log('✅ Perfect! We can use 2 restaurants for multi-tenant testing:\n');
  console.log(`Restaurant A: ${data[0].name}`);
  console.log(`Restaurant B: ${data[1].name}`);
}
