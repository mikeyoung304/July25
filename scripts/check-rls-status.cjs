#!/usr/bin/env node
/**
 * RLS (Row Level Security) Status Checker
 * Verifies RLS is enabled and forced on critical tables
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Tables to check
const CRITICAL_TABLES = ['orders', 'order_status_history', 'user_restaurants'];

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  console.log('=' .repeat(60));
  console.log('RLS STATUS CHECK');
  console.log('=' .repeat(60));

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Query RLS status for critical tables
    const query = `
      SELECT 
        n.nspname as schema,
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced,
        COALESCE(
          (SELECT COUNT(*) 
           FROM pg_policies p 
           WHERE p.schemaname = n.nspname 
           AND p.tablename = c.relname), 
          0
        ) as policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
      AND c.relname = ANY($1)
      ORDER BY n.nspname, c.relname;
    `;

    const result = await client.query(query, [CRITICAL_TABLES]);

    // Format output
    const output = [];
    output.push('Table                     | RLS Enabled | RLS Forced | Policies');
    output.push('-'.repeat(70));

    let allEnabled = true;
    let allForced = true;

    for (const row of result.rows) {
      const enabled = row.rls_enabled ? '✅ Yes' : '❌ No';
      const forced = row.rls_forced ? '✅ Yes' : '⚠️  No';
      const policies = row.policy_count;

      output.push(
        `${row.table_name.padEnd(25)} | ${enabled.padEnd(11)} | ${forced.padEnd(10)} | ${policies}`
      );

      if (!row.rls_enabled) allEnabled = false;
      if (!row.rls_forced) allForced = false;
    }

    // Check for missing tables
    const foundTables = result.rows.map(r => r.table_name);
    const missingTables = CRITICAL_TABLES.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      output.push('');
      output.push('⚠️  Missing tables: ' + missingTables.join(', '));
    }

    // Summary
    output.push('');
    output.push('=' .repeat(70));
    output.push('SUMMARY:');
    if (allEnabled && allForced) {
      output.push('✅ All critical tables have RLS enabled and forced');
    } else {
      if (!allEnabled) {
        output.push('❌ Some tables do not have RLS enabled');
      }
      if (!allForced) {
        output.push('⚠️  Some tables do not have RLS forced (bypassed by BYPASSRLS)');
      }
    }

    // Print to console
    console.log(output.join('\n'));

    // Write to file
    const reportPath = path.join(__dirname, '..', 'reports', 'rls-status.txt');
    fs.writeFileSync(reportPath, output.join('\n'));
    console.log(`\n📊 Results written to reports/rls-status.txt`);

  } catch (error) {
    console.error('❌ Error checking RLS status:', error.message);
    
    // Write error to report
    const reportPath = path.join(__dirname, '..', 'reports', 'rls-status.txt');
    fs.writeFileSync(reportPath, `ERROR: ${error.message}\n`);
  } finally {
    await client.end();
  }
}

// Run
main().catch(console.error);