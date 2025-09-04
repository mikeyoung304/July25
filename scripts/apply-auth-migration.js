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

async function applyAuthMigration() {
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
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250130_auth_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration as one transaction
    console.log('📝 Applying auth tables migration...');
    
    await client.query('BEGIN');
    
    try {
      // Split and execute statements
      const statements = sql
        .split(/;\s*$/m)
        .filter(stmt => {
          const trimmed = stmt.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        });
      
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Auth tables migration applied successfully!');
      
      // Verify tables were created
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_profiles', 'user_restaurants', 'user_pins', 'station_tokens', 'auth_logs')
        ORDER BY table_name
      `);
      
      console.log('\n📊 Created tables:');
      tables.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    
    console.log('\n✨ Auth migration complete!');
    console.log('🔒 Authentication tables are ready.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔚 Database connection closed');
  }
}

// Run the migration
applyAuthMigration();