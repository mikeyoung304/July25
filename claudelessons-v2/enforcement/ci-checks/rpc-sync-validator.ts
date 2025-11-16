#!/usr/bin/env node

/**
 * RPC Sync Validator - Prevents schema/RPC mismatches that caused 500 errors
 * @incident Multiple RPC mismatches (Oct 29, 2025)
 * @timeLost 3+ days across multiple incidents
 * @cost $1,875+
 *
 * This validator ensures that when database tables are modified,
 * all RPC functions that reference them are updated accordingly.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

interface RPCFunction {
  name: string;
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
  definition: string;
}

interface ValidationError {
  severity: 'error' | 'warning';
  rpc: string;
  table: string;
  issue: string;
  suggestion: string;
}

class RPCSyncValidator {
  private supabase: any;
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get all tables and their columns from the database
   */
  async getTableSchemas(): Promise<Map<string, TableColumn[]>> {
    const { data: columns, error } = await this.supabase.rpc('get_table_columns');

    if (error) {
      // Fallback to information_schema query
      const query = `
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;

      const { data, error: queryError } = await this.supabase.rpc('execute_sql', { query });
      if (queryError) throw queryError;
      columns = data;
    }

    const schemas = new Map<string, TableColumn[]>();

    columns.forEach((col: any) => {
      const tableName = col.table_name;
      if (!schemas.has(tableName)) {
        schemas.set(tableName, []);
      }

      schemas.get(tableName)!.push({
        name: col.column_name,
        type: this.normalizeType(col.data_type),
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      });
    });

    return schemas;
  }

  /**
   * Get all RPC functions from the database
   */
  async getRPCFunctions(): Promise<RPCFunction[]> {
    const query = `
      SELECT
        routine_name,
        routine_definition,
        data_type as return_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    `;

    const { data: functions, error } = await this.supabase.rpc('execute_sql', { query });
    if (error) throw error;

    const paramQuery = `
      SELECT
        specific_name,
        parameter_name,
        data_type,
        parameter_mode
      FROM information_schema.parameters
      WHERE specific_schema = 'public'
        AND parameter_mode IN ('IN', 'INOUT')
      ORDER BY ordinal_position
    `;

    const { data: params, error: paramError } = await this.supabase.rpc('execute_sql', { query: paramQuery });
    if (paramError) throw paramError;

    // Group parameters by function
    const paramsByFunction = new Map<string, any[]>();
    params.forEach((param: any) => {
      if (!paramsByFunction.has(param.specific_name)) {
        paramsByFunction.set(param.specific_name, []);
      }
      paramsByFunction.get(param.specific_name)!.push(param);
    });

    return functions.map((func: any) => ({
      name: func.routine_name,
      parameters: paramsByFunction.get(func.routine_name) || [],
      returnType: func.return_type,
      definition: func.routine_definition || ''
    }));
  }

  /**
   * Extract table references from RPC function definition
   */
  extractTableReferences(definition: string): string[] {
    const tables = new Set<string>();

    // Match FROM and JOIN clauses
    const fromMatches = definition.matchAll(/(?:FROM|JOIN)\s+([a-z_]+)/gi);
    for (const match of fromMatches) {
      tables.add(match[1]);
    }

    // Match INSERT INTO, UPDATE, DELETE FROM
    const dmlMatches = definition.matchAll(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-z_]+)/gi);
    for (const match of dmlMatches) {
      tables.add(match[1]);
    }

    return Array.from(tables);
  }

  /**
   * Normalize PostgreSQL types to a common format
   */
  normalizeType(type: string): string {
    const normalizedType = type.toLowerCase();

    // Common type mappings
    const mappings: Record<string, string> = {
      'character varying': 'text',
      'varchar': 'text',
      'char': 'text',
      'timestamp with time zone': 'timestamptz',
      'timestamp without time zone': 'timestamp',
      'integer': 'int',
      'bigint': 'int8',
      'smallint': 'int2',
      'double precision': 'float8',
      'real': 'float4'
    };

    return mappings[normalizedType] || normalizedType;
  }

  /**
   * Validate that RPC parameters match table columns
   */
  validateRPCParameters(
    rpc: RPCFunction,
    table: string,
    columns: TableColumn[]
  ): void {
    // Check for create/update RPCs
    if (rpc.name.includes('create_') || rpc.name.includes('update_')) {
      const columnMap = new Map(columns.map(c => [c.name, c]));

      // Check each parameter
      rpc.parameters.forEach(param => {
        const paramName = param.name.replace(/^p_/, ''); // Remove p_ prefix if present
        const column = columnMap.get(paramName);

        if (column) {
          // Check type compatibility
          if (this.normalizeType(param.type) !== column.type) {
            this.errors.push({
              severity: 'error',
              rpc: rpc.name,
              table,
              issue: `Parameter ${param.name} type mismatch: RPC has ${param.type}, table has ${column.type}`,
              suggestion: `ALTER FUNCTION ${rpc.name} - change parameter ${param.name} to ${column.type}`
            });
          }
        }
      });

      // Check for missing required columns
      columns.forEach(column => {
        if (!column.nullable && !column.default) {
          const hasParam = rpc.parameters.some(p =>
            p.name === column.name || p.name === `p_${column.name}`
          );

          if (!hasParam && column.name !== 'id' && column.name !== 'created_at') {
            this.warnings.push({
              severity: 'warning',
              rpc: rpc.name,
              table,
              issue: `Required column ${column.name} not in RPC parameters`,
              suggestion: `Add parameter p_${column.name} ${column.type} to ${rpc.name}`
            });
          }
        }
      });
    }
  }

  /**
   * Check for common patterns that cause issues
   */
  checkCommonPatterns(rpc: RPCFunction): void {
    // Pattern 1: VARCHAR vs TEXT mismatch
    if (rpc.definition.includes('VARCHAR') || rpc.definition.includes('character varying')) {
      this.warnings.push({
        severity: 'warning',
        rpc: rpc.name,
        table: 'general',
        issue: 'Using VARCHAR instead of TEXT',
        suggestion: 'Use TEXT for all string columns (per ADR-XXX)'
      });
    }

    // Pattern 2: TIMESTAMP without timezone
    if (rpc.definition.includes('TIMESTAMP') && !rpc.definition.includes('WITH TIME ZONE')) {
      this.errors.push({
        severity: 'error',
        rpc: rpc.name,
        table: 'general',
        issue: 'Using TIMESTAMP without timezone',
        suggestion: 'Use TIMESTAMPTZ for all timestamp columns'
      });
    }

    // Pattern 3: Demo user compatibility
    if (rpc.name.includes('order') || rpc.name.includes('checkout')) {
      if (rpc.definition.includes('user_id UUID NOT NULL')) {
        this.errors.push({
          severity: 'error',
          rpc: rpc.name,
          table: 'orders',
          issue: 'UUID NOT NULL constraint breaks demo users',
          suggestion: 'Make user_id nullable and add demo_user_info JSONB column'
        });
      }
    }
  }

  /**
   * Main validation function
   */
  async validate(): Promise<boolean> {
    console.log(chalk.blue('🔍 Validating RPC/Schema Synchronization...\n'));

    try {
      // Get current state
      const [schemas, rpcs] = await Promise.all([
        this.getTableSchemas(),
        this.getRPCFunctions()
      ]);

      console.log(chalk.gray(`Found ${schemas.size} tables and ${rpcs.length} RPC functions\n`));

      // Validate each RPC
      for (const rpc of rpcs) {
        // Extract table references
        const tables = this.extractTableReferences(rpc.definition);

        // Validate against each referenced table
        for (const table of tables) {
          const columns = schemas.get(table);
          if (columns) {
            this.validateRPCParameters(rpc, table, columns);
          }
        }

        // Check common patterns
        this.checkCommonPatterns(rpc);
      }

      // Special check for recent migrations
      await this.checkRecentMigrations(schemas, rpcs);

      // Report results
      return this.reportResults();

    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error);
      return false;
    }
  }

  /**
   * Check if recent migrations have been reflected in RPCs
   */
  async checkRecentMigrations(
    schemas: Map<string, TableColumn[]>,
    rpcs: RPCFunction[]
  ): Promise<void> {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

    if (!fs.existsSync(migrationsDir)) return;

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .slice(-5); // Check last 5 migrations

    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Look for ALTER TABLE statements
      const alterMatches = content.matchAll(/ALTER\s+TABLE\s+([a-z_]+)\s+ADD\s+COLUMN\s+([a-z_]+)/gi);

      for (const match of alterMatches) {
        const [, table, column] = match;

        // Check if any RPC that touches this table has been updated
        const affectedRPCs = rpcs.filter(rpc =>
          rpc.definition.toLowerCase().includes(table.toLowerCase())
        );

        for (const rpc of affectedRPCs) {
          if (!rpc.definition.includes(column)) {
            this.warnings.push({
              severity: 'warning',
              rpc: rpc.name,
              table,
              issue: `Migration ${file} added column ${column} but RPC may not be updated`,
              suggestion: `Review ${rpc.name} to ensure it handles new column ${column}`
            });
          }
        }
      }
    }
  }

  /**
   * Report validation results
   */
  reportResults(): boolean {
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('✅ All RPC functions are synchronized with schema!\n'));
      return true;
    }

    // Report errors
    if (this.errors.length > 0) {
      console.log(chalk.red(`\n❌ Found ${this.errors.length} critical issues:\n`));

      this.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. [${error.rpc}] ${error.issue}`));
        console.log(chalk.yellow(`   Fix: ${error.suggestion}\n`));
      });
    }

    // Report warnings
    if (this.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Found ${this.warnings.length} warnings:\n`));

      this.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`${index + 1}. [${warning.rpc}] ${warning.issue}`));
        console.log(chalk.gray(`   Suggestion: ${warning.suggestion}\n`));
      });
    }

    // Provide fix commands
    console.log(chalk.blue('\n📝 To fix these issues:\n'));
    console.log('1. Update RPC functions to match current schema');
    console.log('2. Use the provided ALTER FUNCTION commands');
    console.log('3. Test with: npm run claudelessons:validate\n');

    return this.errors.length === 0;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new RPCSyncValidator();

  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export default RPCSyncValidator;