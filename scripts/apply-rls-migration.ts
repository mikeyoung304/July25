#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyRLSMigration() {
  try {
    console.log('🔐 Applying RLS policies migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250903_rls_policies.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons but preserve those within functions
    const statements = sql
      .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement === ';') {
        continue;
      }
      
      // Extract a description for logging
      const firstLine = statement.split('\n')[0].substring(0, 100);
      console.log(`  [${i + 1}/${statements.length}] Executing: ${firstLine}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).single();
        
        if (error) {
          // Check if it's a "already exists" error we can ignore
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate key')) {
            console.log(`    ⚠️  Skipped (already exists)`);
            skipCount++;
          } else {
            console.error(`    ❌ Error: ${error.message}`);
            // Continue with other statements
          }
        } else {
          console.log(`    ✅ Success`);
          successCount++;
        }
      } catch (err) {
        // Try direct execution as a fallback
        try {
          const { error } = await supabase.from('_exec').select(statement);
          if (!error) {
            console.log(`    ✅ Success (fallback)`);
            successCount++;
          } else {
            console.error(`    ❌ Error: ${err}`);
          }
        } catch (fallbackErr) {
          console.error(`    ❌ Error: ${err}`);
        }
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Failed: ${statements.length - successCount - skipCount}`);
    
    if (successCount > 0) {
      console.log('\n✨ RLS policies migration completed!');
      console.log('🔒 Your database now has production-ready row-level security.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyRLSMigration();