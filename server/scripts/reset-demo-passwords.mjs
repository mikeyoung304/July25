import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xiwfhcikfdoshxwbtjxt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Service key present:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getUserAndReset(email, password) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error(`User ${email} not found`);
    return;
  }
  
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: password }
  );
  
  if (updateError) {
    console.error(`Error resetting password for ${email}:`, updateError);
  } else {
    console.log(`✅ Password reset successfully for ${email}`);
  }
}

// Reset all demo users
await Promise.all([
  getUserAndReset('server@restaurant.com', 'Demo123!'),
  getUserAndReset('manager@restaurant.com', 'Demo123!'),
  getUserAndReset('kitchen@restaurant.com', 'Demo123!'),
  getUserAndReset('expo@restaurant.com', 'Demo123!')
]);

console.log('\n✅ All passwords reset to: Demo123!');
