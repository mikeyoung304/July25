import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      // Prevent importing from legacy CartContext
      'no-restricted-imports': ['error', {
        'paths': [
          {
            name: '@/modules/order-system/context/CartContext',
            message: 'Use @/contexts/UnifiedCartContext instead of the legacy CartContext'
          },
          {
            name: './cartContext.hooks',
            message: 'Use useUnifiedCart from @/contexts/UnifiedCartContext instead'
          }
        ]
      }],
      // Prevent Node.js patterns in client code
      'no-restricted-globals': ['error',
        {
          name: 'require',
          message: 'Use ES6 imports instead of require() in client code'
        },
        {
          name: 'module',
          message: 'module is a Node.js global. Use ES6 modules in client code'
        },
        {
          name: 'exports',
          message: 'exports is a Node.js global. Use ES6 export syntax in client code'
        },
        {
          name: '__dirname',
          message: '__dirname is a Node.js global not available in browsers'
        },
        {
          name: '__filename',
          message: '__filename is a Node.js global not available in browsers'
        },
        {
          name: 'process',
          message: 'process is a Node.js global. Use import.meta.env or browser APIs in client code'
        },
        {
          name: 'Buffer',
          message: 'Buffer is a Node.js global. Use Uint8Array or browser APIs in client code'
        }
      ],
    },
  },
  {
    files: [
      '**/test-utils/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}'
    ],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
);
