/**
 * ESLint Custom Plugin for Claude Lessons v3
 *
 * Anti-pattern detection based on production incidents
 * Time saved: 120+ days of debugging
 */

module.exports = {
  rules: {
    'no-skip-without-quarantine': require('./no-skip-without-quarantine'),
    'require-api-timeout': require('./require-api-timeout'),
    'no-uncleared-timers': require('./no-uncleared-timers'),
    'require-jwt-fields': require('./require-jwt-fields'),
    'require-multi-tenant-filter': require('./require-multi-tenant-filter')
  },
  configs: {
    recommended: {
      plugins: ['custom'],
      rules: {
        'custom/no-skip-without-quarantine': 'error',
        'custom/require-api-timeout': ['error', {
          timeout: 30000,
          allowedWrappers: ['withTimeout', 'withRetry']
        }],
        'custom/no-uncleared-timers': 'error',
        'custom/require-jwt-fields': ['error', {
          requiredFields: ['restaurant_id', 'scope', 'user_id'],
          allowSubForUserId: true
        }],
        'custom/require-multi-tenant-filter': ['error', {
          exemptTables: ['profiles', 'restaurant_users', 'system_config']
        }]
      }
    }
  }
};