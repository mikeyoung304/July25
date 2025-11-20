/**
 * ESLint Rule: no-skip-without-quarantine
 *
 * Requires quarantine comments when skipping tests.
 * Prevents untracked test failures from accumulating.
 */

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require quarantine comment when skipping tests',
      category: 'Testing'
    },
    messages: {
      missingQuarantine: 'Skipped test must include quarantine comment: /* quarantine: reason */'
    }
  },

  create(context) {
    function hasQuarantineComment(node) {
      // Check for comments before the test
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);

      return comments.some(comment =>
        comment.value.toLowerCase().includes('quarantine')
      );
    }

    return {
      CallExpression(node) {
        // Detect it.skip(), test.skip(), describe.skip()
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'skip' &&
            ['it', 'test', 'describe'].includes(node.callee.object.name)) {

          if (!hasQuarantineComment(node)) {
            context.report({
              node,
              messageId: 'missingQuarantine'
            });
          }
        }
      }
    };
  }
};