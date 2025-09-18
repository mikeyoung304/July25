#!/usr/bin/env tsx

import 'dotenv/config';

type PgClientCtor = typeof import('pg').Client;

async function loadPg(): Promise<PgClientCtor> {
  try {
    const mod = await import('pg');
    return mod.Client;
  } catch (error) {
    console.error('\n❌ Failed to load "pg" module. Install it with `npm install --save-dev pg` and retry.');
    throw error;
  }
}

const REQUIRED_ENV = ['DATABASE_URL'] as const;

function ensureEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error('\n❌ Missing environment variables for RLS verification:', missing.join(', '));
    console.error('Set them (e.g. export DATABASE_URL=...) or provide a .env before running check:rls.');
    process.exitCode = 1;
    throw new Error('Environment configuration incomplete');
  }
}

async function verifyRls(): Promise<number> {
  ensureEnv();

  const Client = await loadPg();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const requiredTables = [
    'orders',
    'order_status_history',
    'voice_order_logs',
    'user_restaurants',
    'station_tokens',
    'user_profiles',
  ];

  try {
    await client.connect();
    console.log('🔌 Connected to database');

    const rlsQuery = `
      SELECT 
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled,
        c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1)
        AND c.relkind = 'r'
      ORDER BY c.relname;
    `;

    const { rows: rlsRows } = await client.query(rlsQuery, [requiredTables]);
    console.log('\n=== RLS Status on Required Tables ===');
    console.table(rlsRows);

    const missingTables = requiredTables.filter(
      (table) => !rlsRows.find((row) => row.table_name === table)
    );
    if (missingTables.length) {
      console.warn('\n⚠️ Tables missing from RLS check:', missingTables.join(', '));
    }

    const unenforced = rlsRows.filter((row) => !row.rls_enabled || !row.rls_forced);
    if (unenforced.length) {
      console.error('\n❌ RLS not enforced on:', unenforced);
      return 1;
    }

    const policyQuery = `
      SELECT tablename,
             policyname,
             cmd,
             COALESCE(nullif(qual, ''), '<none>') AS qual,
             COALESCE(nullif(with_check, ''), '<none>') AS with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
      ORDER BY tablename, policyname;
    `;

    const { rows: policyRows } = await client.query(policyQuery, [requiredTables]);
    console.log('\n=== Effective RLS Policies ===');
    if (policyRows.length) {
      console.table(policyRows);
    } else {
      console.warn('No policies found. RLS may not be configured.');
      return 1;
    }

    const fkQuery = `
      SELECT tc.table_name,
             kcu.column_name,
             ccu.table_name AS fk_table,
             ccu.column_name AS fk_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY($1)
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const { rows: fkRows } = await client.query(fkQuery, [requiredTables]);
    console.log('\n=== Foreign Key Relationships (Tenant Isolation) ===');
    console.table(fkRows);

    console.log('\n✅ RLS verification complete.');
    return 0;
  } catch (error) {
    console.error('\n❌ Failed to verify RLS:', (error as Error).message);
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

verifyRls().then((code) => {
  if (code !== 0) {
    process.exitCode = code;
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
