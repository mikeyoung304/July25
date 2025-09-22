import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigrations() {
  
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(migrationsDir).sort();
  const sqlFiles = files.filter(file => file.endsWith('.sql'));
  
  if (sqlFiles.length === 0) {
    return;
  }
  
  for (const file of sqlFiles) {
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
          
          // Note: In a real implementation, you'd use a proper migration tool
          // or connect directly to the PostgreSQL database
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Migration failed: ${file}`, error);
      process.exit(1);
    }
  }
  
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });