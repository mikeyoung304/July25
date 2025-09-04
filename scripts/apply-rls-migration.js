#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL in .env');
  process.exit(1);
}

async function applyRLSMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔐 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to Supabase database');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250903_rls_policies.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements (basic split, may need refinement)
    const statements = sql
      .split(/;\s*$(?=(?:[^']*'[^']*')*[^']*$)/m)
      .filter(stmt => {
        const trimmed = stmt.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      });
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    let errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      // Get first line for logging
      const firstLine = statement.split('\n')[0].substring(0, 80);
      process.stdout.write(`  [${i + 1}/${statements.length}] ${firstLine}...`);
      
      try {
        await client.query(statement);
        console.log(' ✅');
        successCount++;
      } catch (err) {
        if (err.message?.includes('already exists') || 
            err.message?.includes('duplicate')) {
          console.log(' ⚠️  (already exists)');
          skipCount++;
        } else {
          console.log(' ❌');
          errors.push({ statement: firstLine, error: err.message });
        }
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Failed: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ statement, error }) => {
        console.log(`   - ${statement}`);
        console.log(`     Error: ${error}`);
      });
    }
    
    if (successCount > 0) {
      console.log('\n✨ RLS policies migration completed!');
      console.log('🔒 Your database now has production-ready row-level security.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔚 Database connection closed');
  }
}

// Run the migration
applyRLSMigration();