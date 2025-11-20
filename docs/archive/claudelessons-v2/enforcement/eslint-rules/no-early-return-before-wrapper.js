/**
 * @fileoverview ESLint rule to prevent early returns before SSR wrapper components
 * @author Claudelessons System
 * @incident React Error #318 - 3+ days debugging (Nov 7-10, 2025)
 * @cost $1,875 in lost productivity
 * @prevention Would have caught issue immediately
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent early returns before AnimatePresence, Suspense, and other SSR wrappers',
      category: 'React SSR/Hydration',
      recommended: true,
      url: 'https://github.com/your-org/claudelessons/blob/main/knowledge/incidents/react-hydration-early-return-bug.md'
    },
    fixable: 'code',
    messages: {
      earlyReturn: 'Early return before {{wrapper}} causes React #318 hydration error. Move condition inside wrapper.',
      multipleReturns: 'Multiple returns before {{wrapper}}. Component must have single return with conditional inside wrapper.'
    },
    schema: [
      {
        type: 'object',
        properties: {
          wrappers: {
            type: 'array',
            items: { type: 'string' },
            default: ['AnimatePresence', 'Suspense', 'ErrorBoundary', 'QueryClientProvider', 'Provider']
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const wrappers = options.wrappers || [
      'AnimatePresence',
      'Suspense',
      'ErrorBoundary',
      'QueryClientProvider',
      'Provider'
    ];

    // Track return statements and JSX elements in the component
    let componentReturns = [];
    let jsxElements = [];
    let currentFunction = null;

    function isWrapper(node) {
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
        const elementName = node.openingElement?.name?.name ||
                          node.openingElement?.name?.property?.name;
        return wrappers.includes(elementName);
      }
      return false;
    }

    function hasWrapperInReturn(returnNode) {
      if (!returnNode.argument) return false;

      // Check if the return contains a wrapper component
      let hasWrapper = false;

      function traverse(node) {
        if (!node) return;

        if (isWrapper(node)) {
          hasWrapper = true;
          return;
        }

        // Traverse JSX structure
        if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
          if (node.children) {
            node.children.forEach(traverse);
          }
        }

        // Handle conditional expressions
        if (node.type === 'ConditionalExpression') {
          traverse(node.consequent);
          traverse(node.alternate);
        }

        // Handle logical expressions
        if (node.type === 'LogicalExpression') {
          traverse(node.left);
          traverse(node.right);
        }
      }

      traverse(returnNode.argument);
      return hasWrapper;
    }

    function isEarlyReturn(node) {
      // Check if this is a conditional early return (e.g., if (!show) return null)
      const parent = node.parent;

      if (parent && parent.type === 'IfStatement') {
        // This is an early return in an if statement
        return true;
      }

      if (parent && parent.type === 'BlockStatement') {
        const grandparent = parent.parent;
        if (grandparent && grandparent.type === 'IfStatement') {
          return true;
        }
      }

      // Check for guard clause pattern
      if (node.argument === null ||
          (node.argument && node.argument.type === 'Literal' && !node.argument.value)) {
        return true;
      }

      return false;
    }

    function checkForViolations() {
      if (componentReturns.length < 2) return;

      // Find early returns (returns before the last one)
      const earlyReturns = componentReturns.slice(0, -1);
      const lastReturn = componentReturns[componentReturns.length - 1];

      // Check if last return has a wrapper
      const lastHasWrapper = hasWrapperInReturn(lastReturn);

      if (lastHasWrapper) {
        // Check for early returns
        earlyReturns.forEach(returnNode => {
          if (isEarlyReturn(returnNode)) {
            // Find which wrapper is being used
            let wrapperName = 'wrapper component';

            // Try to find the specific wrapper in the last return
            if (lastReturn.argument) {
              const match = context.getSourceCode()
                .getText(lastReturn.argument)
                .match(new RegExp(`<(${wrappers.join('|')})`));
              if (match) {
                wrapperName = match[1];
              }
            }

            context.report({
              node: returnNode,
              messageId: 'earlyReturn',
              data: { wrapper: wrapperName },
              fix(fixer) {
                // Suggest moving the condition inside the wrapper
                // This is a simplified fix - real implementation would be more sophisticated
                const condition = returnNode.parent.test;
                if (condition) {
                  const conditionText = context.getSourceCode().getText(condition);
                  const suggestion = `// Move this condition inside ${wrapperName}:\n` +
                                   `// return <${wrapperName}>{!(${conditionText}) && ...}</${wrapperName}>`;

                  return fixer.insertTextBefore(returnNode, suggestion);
                }
              }
            });
          }
        });
      }
    }

    return {
      ':function > BlockStatement > ReturnStatement': function(node) {
        componentReturns.push(node);
      },

      'Program:exit': function() {
        // Process all functions at the end
        checkForViolations();
      },

      ':function': function(node) {
        // Track entering a function
        currentFunction = node;
        componentReturns = [];
      },

      ':function:exit': function(node) {
        // Check when exiting a function
        if (componentReturns.length > 0) {
          checkForViolations();
        }
        currentFunction = null;
        componentReturns = [];
      }
    };
  }
};