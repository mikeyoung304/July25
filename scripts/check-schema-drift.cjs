#!/usr/bin/env node

/**
 * Schema Drift Detection
 *
 * Compares documented schema in docs/reference/schema/DATABASE.md
 * with actual schema from migration files in supabase/migrations/*.sql
 *
 * Exit codes:
 * - 0: No drift detected
 * - 1: Drift detected or error
 */

const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.join(__dirname, '../docs/reference/schema/DATABASE.md');
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');

// Known tables to check
const CORE_TABLES = [
  'restaurants',
  'users',
  'menu_items',
  'orders',
  'tables',
  'payment_audit_logs',
  'audit_logs'
];

// Columns from initial schema (not tracked in migrations)
// These are from the baseline schema and don't appear in migration files
const INITIAL_SCHEMA_COLUMNS = {
  users: [
    // Supabase auth.users table columns
    'instance_id', 'aud', 'role', 'email', 'encrypted_password',
    'email_confirmed_at', 'invited_at', 'confirmation_token',
    'confirmation_sent_at', 'recovery_token', 'recovery_sent_at',
    'email_change_token_new', 'email_change', 'email_change_sent_at',
    'last_sign_in_at', 'raw_app_meta_data', 'raw_user_meta_data',
    'is_super_admin', 'phone', 'phone_confirmed_at', 'phone_change',
    'phone_change_token', 'phone_change_sent_at', 'confirmed_at',
    'email_change_token_current', 'email_change_confirm_status',
    'banned_until', 'reauthentication_token', 'reauthentication_sent_at',
    'is_sso_user', 'deleted_at', 'is_anonymous',
    // Supabase relations
    'identities', 'mfa_factors', 'oauth_authorizations',
    'oauth_consents', 'one_time_tokens', 'sessions',
    'payment_audit_logs', 'user_pins', 'user_profiles', 'user_restaurants'
  ],
  menu_items: [
    'restaurant_id', 'category_id', 'name', 'description', 'price',
    'active', 'available', 'dietary_flags', 'modifiers', 'aliases',
    'prep_time_minutes', 'image_url', 'external_id'
  ],
  orders: [
    'restaurant_id', 'order_number', 'type', 'status', 'items',
    'subtotal', 'tax', 'total_amount', 'notes', 'customer_name',
    'table_number', 'metadata', 'preparing_at', 'ready_at',
    'completed_at', 'cancelled_at', 'auto_fire_time', 'is_scheduled',
    'manually_fired', 'order_status_history', 'payment_audit_logs',
    'tables', 'voice_order_logs'
  ],
  restaurants: [
    'name', 'slug', 'timezone', 'settings', 'active',
    'menu_categories', 'menu_items', 'order_status_history',
    'orders', 'station_tokens', 'tables', 'user_pins',
    'user_restaurants', 'voice_order_logs'
  ],
  tables: [
    'restaurant_id', 'label', 'seats', 'x_pos', 'y_pos',
    'width', 'height', 'rotation', 'shape', 'status',
    'current_order_id', 'active', 'z_index'
  ],
  payment_audit_logs: [
    'order_id', 'user_id', 'restaurant_id', 'amount',
    'payment_method', 'payment_id', 'status', 'error_code',
    'error_detail', 'ip_address', 'user_agent', 'idempotency_key',
    'metadata'
  ]
};

// Parse documented tables from DATABASE.md
function parseDocumentedSchema() {
  const content = fs.readFileSync(DOCS_PATH, 'utf-8');
  const documented = {};

  // Extract table sections (### tablename)
  const tableRegex = /###\s+(\w+)\s*\n([\s\S]*?)(?=###|\n##|$)/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const tableContent = match[2];

    // Skip non-table sections
    if (tableName === 'Realtime' || tableName === 'Storage') continue;

    // Extract columns from markdown table
    const columns = [];
    const columnRegex = /\|\s*(\w+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g;
    let colMatch;

    while ((colMatch = columnRegex.exec(tableContent)) !== null) {
      const columnName = colMatch[1].trim();
      const columnType = colMatch[2].trim();
      const description = colMatch[3].trim();

      // Skip header rows
      if (columnName === 'Column' || columnName === '---') continue;

      columns.push({
        name: columnName,
        type: columnType,
        description
      });
    }

    if (columns.length > 0) {
      documented[tableName] = columns;
    }
  }

  return documented;
}

// Parse migration files for schema changes
function parseMigrationSchema() {
  const migrations = {};

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migration directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    // Look for ALTER TABLE ADD COLUMN statements (with optional IF NOT EXISTS)
    const alterRegex = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)\s+([^;,\n]+)/gi;
    let match;

    while ((match = alterRegex.exec(content)) !== null) {
      const tableName = match[1];
      const columnName = match[2];
      const columnDef = match[3].trim();

      if (!migrations[tableName]) {
        migrations[tableName] = [];
      }

      migrations[tableName].push({
        column: columnName,
        definition: columnDef,
        migration: file
      });
    }

    // Look for CREATE TABLE statements
    const createRegex = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
    while ((match = createRegex.exec(content)) !== null) {
      const tableName = match[1];
      const columnDefs = match[2];

      // Parse column definitions
      const columnRegex = /(\w+)\s+([^,\n]+)/g;
      let colMatch;

      if (!migrations[tableName]) {
        migrations[tableName] = [];
      }

      while ((colMatch = columnRegex.exec(columnDefs)) !== null) {
        const columnName = colMatch[1];
        const columnDef = colMatch[2].trim();

        // Skip constraints
        if (['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE'].includes(columnName)) {
          continue;
        }

        migrations[tableName].push({
          column: columnName,
          definition: columnDef,
          migration: file
        });
      }
    }
  });

  return migrations;
}

// Check for drift
function checkDrift() {
  console.log('🔍 Checking schema drift...\n');

  const documented = parseDocumentedSchema();
  const migrations = parseMigrationSchema();

  let driftCount = 0;

  // Check for columns in migrations but not in docs
  Object.keys(migrations).forEach(tableName => {
    if (!CORE_TABLES.includes(tableName)) {
      return; // Skip non-core tables
    }

    const migrationColumns = migrations[tableName];
    const docColumns = documented[tableName] || [];
    const docColumnNames = docColumns.map(c => c.name);

    migrationColumns.forEach(col => {
      if (!docColumnNames.includes(col.column)) {
        console.log(`⚠️  DRIFT DETECTED in table '${tableName}':`);
        console.log(`   Column '${col.column}' exists in migration '${col.migration}'`);
        console.log(`   but is NOT documented in DATABASE.md`);
        console.log(`   Definition: ${col.definition}\n`);
        driftCount++;
      }
    });
  });

  // Check for documented columns that don't appear in migrations
  Object.keys(documented).forEach(tableName => {
    if (!CORE_TABLES.includes(tableName)) {
      return;
    }

    const docColumns = documented[tableName];
    const migrationColumns = migrations[tableName] || [];
    const migrationColumnNames = migrationColumns.map(c => c.column);

    docColumns.forEach(col => {
      // Skip auto-generated columns
      if (['id', 'created_at', 'updated_at'].includes(col.name)) {
        return;
      }

      // Skip columns from initial schema
      const initialColumns = INITIAL_SCHEMA_COLUMNS[tableName] || [];
      if (initialColumns.includes(col.name)) {
        return;
      }

      if (!migrationColumnNames.includes(col.name)) {
        console.log(`⚠️  POTENTIAL DRIFT in table '${tableName}':`);
        console.log(`   Column '${col.name}' is documented but may not exist in migrations`);
        console.log(`   Type: ${col.type}`);
        console.log(`   (Note: This may be a false positive if column was in initial schema)\n`);
        // Don't count this as hard drift since it could be in the base schema
      }
    });
  });

  // Summary
  if (driftCount === 0) {
    console.log('✅ No schema drift detected\n');
    console.log('Checked tables:', CORE_TABLES.join(', '));
    return 0;
  } else {
    console.log(`\n❌ Found ${driftCount} schema drift issue(s)`);
    console.log('\nAction required:');
    console.log('1. Update docs/reference/schema/DATABASE.md');
    console.log('2. Add missing column definitions with types and descriptions');
    console.log('3. Ensure documentation matches migration files');
    return 1;
  }
}

// Run
try {
  process.exit(checkDrift());
} catch (error) {
  console.error('❌ Error checking schema drift:', error.message);
  process.exit(1);
}
