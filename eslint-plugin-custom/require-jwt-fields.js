/**
 * ESLint Rule: require-jwt-fields
 *
 * Enforces JWT structure with required fields to prevent authentication failures.
 * Based on lessons from 48 days of debugging JWT-related issues.
 */

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require restaurant_id, scope, and user_id in JWT tokens',
      category: 'Security'
    },
    schema: [
      {
        type: 'object',
        properties: {
          requiredFields: {
            type: 'array',
            items: { type: 'string' },
            default: ['restaurant_id', 'scope', 'user_id']
          },
          allowSubForUserId: {
            type: 'boolean',
            default: true
          }
        }
      }
    ],
    messages: {
      missingField: 'JWT must include {{field}} field (prevents auth failures)',
      useSubOrUserId: 'JWT must include either user_id or sub field'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const requiredFields = options.requiredFields || ['restaurant_id', 'scope', 'user_id'];
    const allowSubForUserId = options.allowSubForUserId !== false;

    return {
      CallExpression(node) {
        // Detect jwt.sign() or jsonwebtoken.sign()
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'sign' &&
          (node.callee.object.name === 'jwt' || node.callee.object.name === 'jsonwebtoken')
        ) {
          const payloadArg = node.arguments[0];
          if (!payloadArg || payloadArg.type !== 'ObjectExpression') {
            return;
          }

          const presentFields = payloadArg.properties.map(prop => {
            if (prop.key.type === 'Identifier') {
              return prop.key.name;
            }
            if (prop.key.type === 'Literal') {
              return prop.key.value;
            }
            return null;
          }).filter(Boolean);

          // Check each required field
          for (const field of requiredFields) {
            if (field === 'user_id' && allowSubForUserId) {
              // Allow either user_id or sub
              if (!presentFields.includes('user_id') && !presentFields.includes('sub')) {
                context.report({
                  node: payloadArg,
                  messageId: 'useSubOrUserId'
                });
              }
            } else if (!presentFields.includes(field)) {
              context.report({
                node: payloadArg,
                messageId: 'missingField',
                data: { field }
              });
            }
          }
        }
      }
    };
  }
};