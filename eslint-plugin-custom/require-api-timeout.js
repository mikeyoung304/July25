/**
 * ESLint Rule: require-api-timeout
 *
 * Enforces timeout configuration on external API calls.
 * Based on 14 days of debugging hanging API integrations.
 */

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require timeout on external API calls',
      category: 'Best Practices'
    },
    schema: [
      {
        type: 'object',
        properties: {
          timeout: {
            type: 'number',
            default: 30000
          },
          allowedWrappers: {
            type: 'array',
            items: { type: 'string' },
            default: ['withTimeout', 'withRetry']
          }
        }
      }
    ],
    messages: {
      missingTimeout: 'API call to {{url}} must include timeout (prevents hanging)'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedWrappers = options.allowedWrappers || ['withTimeout', 'withRetry'];

    function isWrappedWithTimeout(node) {
      // Check if the call is wrapped with an allowed timeout wrapper
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'CallExpression' &&
            parent.callee.type === 'Identifier' &&
            allowedWrappers.includes(parent.callee.name)) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    function hasTimeoutConfig(node) {
      // Check if axios/fetch config includes timeout
      const configArg = node.arguments[1];
      if (!configArg || configArg.type !== 'ObjectExpression') {
        return false;
      }

      return configArg.properties.some(prop =>
        prop.key && prop.key.name === 'timeout'
      );
    }

    return {
      CallExpression(node) {
        // Detect axios() or fetch() calls
        const isAxios = node.callee.name === 'axios' ||
                       (node.callee.type === 'MemberExpression' &&
                        node.callee.object.name === 'axios');

        const isFetch = node.callee.name === 'fetch';

        if (isAxios || isFetch) {
          // Skip if wrapped with timeout utility
          if (isWrappedWithTimeout(node)) {
            return;
          }

          // Check for timeout config
          if (!hasTimeoutConfig(node)) {
            const urlArg = node.arguments[0];
            let url = 'external API';
            if (urlArg && urlArg.type === 'Literal') {
              url = urlArg.value;
            }

            context.report({
              node,
              messageId: 'missingTimeout',
              data: { url }
            });
          }
        }
      }
    };
  }
};