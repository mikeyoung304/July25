/**
 * Build Safety Test Suite
 * Ensures no dangerous patterns exist in client code that could cause build failures
 */

import { describe, it, expect } from 'vitest'
import { glob } from 'glob'
import { readFileSync } from 'fs'
import path from 'path'

describe('Build Safety Checks', () => {
  describe('require() usage prevention', () => {
    it('should not contain require() calls in client source code', async () => {
      // Get all TypeScript and JavaScript files in client/src
      const clientSrcPath = path.resolve(process.cwd(), 'src')
      const pattern = `${clientSrcPath}/**/*.{ts,tsx,js,jsx}`
      
      const files = await glob(pattern, { 
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}',
          '**/test/**',
          '**/__tests__/**'
        ]
      })

      const violations: Array<{ file: string; line: number; content: string }> = []

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            // Check for require() calls that aren't in comments
            const trimmedLine = line.trim()
            
            // Skip commented lines
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
              return
            }
            
            // Look for require() patterns that would break Vite builds
            // Exclude common false positives like 'validators.required', 'requiredRoles', etc.
            const requirePatterns = [
              /(?<![\w.])\brequire\s*\(/,        // require( not preceded by word or dot
              /(?<![\w.])\brequire\.resolve\s*\(/,  // require.resolve(
              /(?<![\w.])\brequire\s*\[['"]/     // require['module'] or require["module"]
            ]
            
            for (const pattern of requirePatterns) {
              if (pattern.test(line)) {
                // Double-check it's not in a string literal or comment
                const beforeMatch = line.substring(0, line.search(pattern))
                const inString = (beforeMatch.match(/"/g) || []).length % 2 === 1 ||
                               (beforeMatch.match(/'/g) || []).length % 2 === 1 ||
                               (beforeMatch.match(/`/g) || []).length % 2 === 1
                
                const inComment = line.includes('//') && line.indexOf('//') < line.search(pattern)
                
                if (!inString && !inComment) {
                  violations.push({
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    content: line.trim()
                  })
                }
              }
            }
          })
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Could not read file ${file}:`, error)
        }
      }

      if (violations.length > 0) {
        const errorMessage = violations
          .map(v => `${v.file}:${v.line} - ${v.content}`)
          .join('\n')
        
        expect.fail(
          `Found require() calls in client code that will break Vite builds:\n${errorMessage}\n\n` +
          `Use ES6 imports instead:\n` +
          `❌ const fs = require('fs')\n` +
          `✅ import fs from 'fs'\n\n` +
          `For dynamic imports use:\n` +
          `❌ const module = require('module')\n` +
          `✅ const module = await import('module')`
        )
      }

      expect(violations).toHaveLength(0)
    })

    it('should use ES6 imports instead of CommonJS', async () => {
      // This test verifies we're using proper ES6 import syntax
      const clientSrcPath = path.resolve(process.cwd(), 'src')
      const pattern = `${clientSrcPath}/**/*.{ts,tsx}`
      
      const files = await glob(pattern, { 
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
          '**/test/**',
          '**/__tests__/**'
        ]
      })

      let hasImports = false
      let hasExports = false

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8')
          
          // Check for ES6 import/export usage
          if (/^import\s+.+from\s+['"].+['"];?\s*$/m.test(content)) {
            hasImports = true
          }
          if (/^export\s+/m.test(content)) {
            hasExports = true
          }
          
          // If we find both, we're good
          if (hasImports && hasExports) {
            break
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // We should find ES6 syntax in use across the codebase
      expect(hasImports).toBe(true)
      expect(hasExports).toBe(true)
    })
  })

  describe('Node.js specific imports prevention', () => {
    it('should not import Node.js built-in modules in client code', async () => {
      const clientSrcPath = path.resolve(process.cwd(), 'src')
      const pattern = `${clientSrcPath}/**/*.{ts,tsx,js,jsx}`
      
      const files = await glob(pattern, { 
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}',
          '**/test/**',
          '**/__tests__/**'
        ]
      })

      // Node.js built-in modules that shouldn't be used in client code
      const nodeBuiltins = [
        'fs', 'path', 'os', 'crypto', 'stream', 'buffer', 
        'child_process', 'cluster', 'dgram', 'dns', 'http', 
        'https', 'net', 'tls', 'url', 'util', 'v8', 'vm',
        'worker_threads', 'zlib'
      ]

      const violations: Array<{ file: string; line: number; module: string; content: string }> = []

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            const trimmedLine = line.trim()
            
            // Skip comments
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
              return
            }
            
            // Check for imports of Node.js built-ins
            nodeBuiltins.forEach(builtin => {
              const patterns = [
                new RegExp(`import\\s+.*from\\s+['"]${builtin}['"]`),
                new RegExp(`import\\s+.*from\\s+['"]node:${builtin}['"]`),
                new RegExp(`import\\s*\\(\\s*['"]${builtin}['"]\\s*\\)`),
                new RegExp(`import\\s*\\(\\s*['"]node:${builtin}['"]\\s*\\)`)
              ]
              
              for (const pattern of patterns) {
                if (pattern.test(line)) {
                  violations.push({
                    file: path.relative(process.cwd(), file),
                    line: index + 1,
                    module: builtin,
                    content: line.trim()
                  })
                }
              }
            })
          })
        } catch (error) {
          // Skip files that can't be read
        }
      }

      if (violations.length > 0) {
        const errorMessage = violations
          .map(v => `${v.file}:${v.line} - Importing Node.js module "${v.module}": ${v.content}`)
          .join('\n')
        
        expect.fail(
          `Found Node.js built-in imports in client code that will break browser builds:\n${errorMessage}\n\n` +
          `Client code should only import browser-compatible modules.\n` +
          `For file operations, use browser APIs or move logic to server.`
        )
      }

      expect(violations).toHaveLength(0)
    })
  })

  describe('Dynamic import safety', () => {
    it('should use proper dynamic import syntax', async () => {
      const clientSrcPath = path.resolve(process.cwd(), 'src')
      const pattern = `${clientSrcPath}/**/*.{ts,tsx,js,jsx}`
      
      const files = await glob(pattern, { 
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}',
          '**/test/**',
          '**/__tests__/**'
        ]
      })

      const badDynamicImports: Array<{ file: string; line: number; content: string }> = []

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            const trimmedLine = line.trim()
            
            // Skip comments
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
              return
            }
            
            // Check for problematic dynamic import patterns
            // Allow webpack comments like /* webpackChunkName: "name" */
            const badPatterns = [
              /import\s*\(\s*[^'"`\/]/,  // Dynamic import without string literal or comment
              /import\s*\(\s*`[^$]*\$\{/,  // Template literal with variables (risky)
            ]
            
            for (const pattern of badPatterns) {
              if (pattern.test(line)) {
                badDynamicImports.push({
                  file: path.relative(process.cwd(), file),
                  line: index + 1,
                  content: line.trim()
                })
              }
            }
          })
        } catch (error) {
          // Skip files that can't be read
        }
      }

      if (badDynamicImports.length > 0) {
        const errorMessage = badDynamicImports
          .map(v => `${v.file}:${v.line} - ${v.content}`)
          .join('\n')
        
        expect.fail(
          `Found potentially unsafe dynamic imports:\n${errorMessage}\n\n` +
          `Use static string literals for dynamic imports:\n` +
          `✅ import('./module')\n` +
          `❌ import(variableName)\n` +
          `❌ import(\`./\${folder}/module\`)`
        )
      }

      expect(badDynamicImports).toHaveLength(0)
    })
  })

  describe('Environment compatibility', () => {
    it('should check for browser compatibility in voice modules', async () => {
      const voiceModulePath = path.resolve(process.cwd(), 'src/modules/voice')
      const pattern = `${voiceModulePath}/**/*.{ts,tsx}`
      
      const files = await glob(pattern, { 
        ignore: [
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
          '**/test/**',
          '**/__tests__/**'
        ]
      })

      let usesWebAPIs = false
      const requiredWebAPIs = [
        'MediaDevices', 'RTCPeerConnection', 'WebSocket', 
        'AudioContext', 'MediaRecorder', 'Blob'
      ]

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8')
          
          for (const api of requiredWebAPIs) {
            if (content.includes(api)) {
              usesWebAPIs = true
              break
            }
          }
          
          if (usesWebAPIs) break
        } catch (error) {
          // Skip files that can't be read
        }
      }

      // Voice modules should use browser Web APIs
      expect(usesWebAPIs).toBe(true)
    })
  })
})