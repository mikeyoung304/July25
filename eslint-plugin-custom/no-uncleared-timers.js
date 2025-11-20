/**
 * ESLint Rule: no-uncleared-timers
 *
 * Detects setInterval/setTimeout without cleanup in React components.
 * Prevents memory leaks from 7 days of debugging WebSocket issues.
 */

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require cleanup for setInterval and setTimeout in useEffect',
      category: 'Best Practices'
    },
    messages: {
      missingCleanup: '{{timerType}} in useEffect must have cleanup function'
    }
  },

  create(context) {
    return {
      CallExpression(node) {
        // Detect useEffect calls
        if (node.callee.name === 'useEffect') {
          const effectCallback = node.arguments[0];
          if (!effectCallback || effectCallback.type !== 'ArrowFunctionExpression') {
            return;
          }

          let hasTimer = false;
          let hasCleanup = false;
          let timerType = null;

          // Check for timers in the effect body
          if (effectCallback.body.type === 'BlockStatement') {
            for (const statement of effectCallback.body.body) {
              // Check for setInterval/setTimeout calls
              if (statement.type === 'ExpressionStatement' ||
                  statement.type === 'VariableDeclaration') {
                const expr = statement.type === 'VariableDeclaration'
                  ? statement.declarations[0]?.init
                  : statement.expression;

                if (expr && expr.type === 'CallExpression') {
                  if (expr.callee.name === 'setInterval') {
                    hasTimer = true;
                    timerType = 'setInterval';
                  } else if (expr.callee.name === 'setTimeout') {
                    hasTimer = true;
                    timerType = 'setTimeout';
                  }
                }
              }

              // Check for return statement (cleanup)
              if (statement.type === 'ReturnStatement') {
                hasCleanup = true;
              }
            }
          }

          // Report if timer exists without cleanup
          if (hasTimer && !hasCleanup) {
            context.report({
              node: effectCallback,
              messageId: 'missingCleanup',
              data: { timerType }
            });
          }
        }
      }
    };
  }
};