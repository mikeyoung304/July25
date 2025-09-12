#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function checkRLS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check RLS enabled on tables
    const rlsQuery = `
      SELECT 
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('orders','order_status_history','voice_order_logs','user_restaurants','station_tokens','user_profiles')
        AND c.relkind = 'r'
      ORDER BY c.relname;
    `;
    
    console.log('=== RLS Status on Required Tables ===');
    const rlsResult = await client.query(rlsQuery);
    console.table(rlsResult.rows);

    // Check effective policies
    const policiesQuery = `
      SELECT tablename, policyname, cmd, 
             CASE WHEN length(qual) > 50 THEN substring(qual, 1, 47) || '...' ELSE qual END as qual_snippet,
             CASE WHEN length(with_check) > 50 THEN substring(with_check, 1, 47) || '...' ELSE with_check END as check_snippet
      FROM pg_policies
      WHERE schemaname='public'
        AND tablename IN ('orders','order_status_history','voice_order_logs','user_restaurants','station_tokens','user_profiles')
      ORDER BY tablename, policyname;
    `;
    
    console.log('\n=== Effective RLS Policies ===');
    const policiesResult = await client.query(policiesQuery);
    if (policiesResult.rows.length > 0) {
      console.table(policiesResult.rows);
    } else {
      console.log('No policies found - RLS may not be configured!');
    }

    // Check foreign keys for tenant isolation
    const fkQuery = `
      SELECT tc.table_name, kcu.column_name, ccu.table_name as fk_table, ccu.column_name as fk_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name
      WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
        AND tc.table_name IN ('orders','order_status_history','voice_order_logs')
      ORDER BY tc.table_name;
    `;
    
    console.log('\n=== Foreign Key Relationships (Tenant Isolation) ===');
    const fkResult = await client.query(fkQuery);
    console.table(fkResult.rows);

  } catch (err) {
    console.error('Database query error:', err.message);
  } finally {
    await client.end();
  }
}

checkRLS();