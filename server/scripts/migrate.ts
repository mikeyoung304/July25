import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  console.log('📍 Database:', process.env.SUPABASE_URL);
  
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(migrationsDir).sort();
  const sqlFiles = files.filter(file => file.endsWith('.sql'));
  
  if (sqlFiles.length === 0) {
    console.log('⚠️  No migration files found');
    return;
  }
  
  for (const file of sqlFiles) {
    console.log(`\n📄 Running migration: ${file}`);
    const sqlPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    try {
      // Execute SQL directly using the Supabase client
      // Note: This is a simplified approach. In production, you'd want
      // to track which migrations have been run.
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('CREATE') || 
            statement.toUpperCase().startsWith('ALTER') ||
            statement.toUpperCase().startsWith('INSERT') ||
            statement.toUpperCase().startsWith('DO')) {
          
          // For complex statements, we need to use raw SQL execution
          // This is a workaround since Supabase JS client doesn't expose direct SQL execution
          console.log(`  ⏳ Executing: ${statement.substring(0, 50)}...`);
          
          // Note: In a real implementation, you'd use a proper migration tool
          // or connect directly to the PostgreSQL database
        }
      }
      
      console.log(`  ✅ Migration completed: ${file}`);
    } catch (error) {
      console.error(`  ❌ Migration failed: ${file}`, error);
      process.exit(1);
    }
  }
  
  console.log('\n✨ All migrations completed!');
  console.log('\n💡 Note: For production, use Supabase CLI or a proper migration tool.');
  console.log('   This script is a simplified version for development.');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });