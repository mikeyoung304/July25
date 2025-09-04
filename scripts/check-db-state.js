#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Use DATABASE_URL if available, otherwise build from components
const connectionString = process.env.DATABASE_URL || (() => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing DATABASE_URL or SUPABASE credentials in environment');
    process.exit(1);
  }
  
  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error('Could not extract project ref from SUPABASE_URL');
    process.exit(1);
  }
  
  return `postgresql://postgres.${projectRef}:${SUPABASE_SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
})();

const client = new Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runQueries() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database');
    
    const results = {};
    
    // Query 1: Tables + RLS flags
    console.log('\n📊 Checking tables and RLS status...');
    const tablesQuery = `
      SELECT n.nspname, c.relname AS table, c.relrowsecurity AS rls_enabled
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' 
      ORDER BY 1,2
    `;
    const tablesResult = await client.query(tablesQuery);
    results.tables_and_rls = tablesResult.rows;
    console.log(`Found ${tablesResult.rows.length} tables`);
    
    // Query 2: Policies  
    console.log('\n🔒 Checking RLS policies...');
    const policiesQuery = `
      SELECT pol.polname, rel.relname AS table_name, pol.polcmd,
             pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
             pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
      FROM pg_policy pol 
      JOIN pg_class rel ON rel.oid=pol.polrelid
      JOIN pg_namespace n ON n.oid=rel.relnamespace AND n.nspname='public'
      ORDER BY rel.relname, pol.polname
    `;
    const policiesResult = await client.query(policiesQuery);
    results.policies = policiesResult.rows;
    console.log(`Found ${policiesResult.rows.length} policies`);
    
    // Query 3: Required auth tables
    console.log('\n🔑 Checking auth tables existence...');
    const authTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('user_restaurants','user_profiles','user_pins',
                          'station_tokens','api_scopes','role_scopes')
      ORDER BY table_name
    `;
    const authTablesResult = await client.query(authTablesQuery);
    results.auth_tables = authTablesResult.rows;
    
    const expectedAuthTables = ['user_restaurants','user_profiles','user_pins',
                                'station_tokens','api_scopes','role_scopes'];
    const foundTables = authTablesResult.rows.map(r => r.table_name);
    const missingTables = expectedAuthTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`⚠️  Missing auth tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All required auth tables exist');
    }
    
    // Save results
    const outputPath = path.join(__dirname, '../docs/reports/DB_STATE_CONFIRM.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📁 Results saved to: ${outputPath}`);
    
    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log('Tables with RLS enabled:');
    results.tables_and_rls.forEach(t => {
      if (t.rls_enabled) {
        console.log(`  ✅ ${t.table}`);
      }
    });
    
    console.log('\nTables WITHOUT RLS:');
    results.tables_and_rls.forEach(t => {
      if (!t.rls_enabled) {
        console.log(`  ❌ ${t.table}`);
      }
    });
    
    console.log('\nAuth tables status:');
    console.log(`  Found: ${foundTables.join(', ') || 'none'}`);
    console.log(`  Missing: ${missingTables.join(', ') || 'none'}`);
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runQueries();