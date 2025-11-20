/**
 * ESLint Rule: require-multi-tenant-filter
 *
 * Enforces restaurant_id filtering on all Supabase queries.
 * Prevents critical multi-tenancy security vulnerabilities.
 */

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require restaurant_id filter on Supabase queries',
      category: 'Security'
    },
    schema: [
      {
        type: 'object',
        properties: {
          exemptTables: {
            type: 'array',
            items: { type: 'string' },
            default: ['profiles', 'restaurant_users', 'system_config']
          }
        }
      }
    ],
    messages: {
      missingFilter: 'Supabase query on "{{table}}" must filter by restaurant_id'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const exemptTables = options.exemptTables || ['profiles', 'restaurant_users', 'system_config'];

    function checkSupabaseChain(node) {
      // Track the chain of method calls
      let current = node;
      let tableName = null;
      let hasRestaurantFilter = false;

      // Walk up the chain
      while (current && current.type === 'CallExpression') {
        if (current.callee.type === 'MemberExpression') {
          const methodName = current.callee.property.name;

          // Capture table name from .from('table_name')
          if (methodName === 'from' && current.arguments[0]) {
            if (current.arguments[0].type === 'Literal') {
              tableName = current.arguments[0].value;
            }
          }

          // Check for .eq('restaurant_id', ...)
          if (methodName === 'eq' && current.arguments[0]) {
            if (current.arguments[0].type === 'Literal' &&
                current.arguments[0].value === 'restaurant_id') {
              hasRestaurantFilter = true;
            }
          }

          // Check for .filter('restaurant_id.eq...')
          if (methodName === 'filter' && current.arguments[0]) {
            if (current.arguments[0].type === 'Literal') {
              const filterStr = current.arguments[0].value;
              if (filterStr && filterStr.includes('restaurant_id')) {
                hasRestaurantFilter = true;
              }
            }
          }
        }

        // Move to parent call
        if (current.parent && current.parent.type === 'CallExpression') {
          current = current.parent;
        } else if (current.parent && current.parent.type === 'MemberExpression' &&
                   current.parent.parent && current.parent.parent.type === 'CallExpression') {
          current = current.parent.parent;
        } else {
          break;
        }
      }

      // Report if table needs filter and doesn't have one
      if (tableName && !exemptTables.includes(tableName) && !hasRestaurantFilter) {
        context.report({
          node,
          messageId: 'missingFilter',
          data: { table: tableName }
        });
      }
    }

    return {
      CallExpression(node) {
        // Detect supabase.from().select/update/delete()
        if (node.callee.type === 'MemberExpression') {
          const methodName = node.callee.property.name;

          // Check if this is a query method
          if (['select', 'update', 'delete', 'upsert'].includes(methodName)) {
            checkSupabaseChain(node);
          }
        }
      }
    };
  }
};