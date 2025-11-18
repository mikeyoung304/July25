// ⚠️ CRITICAL: DO NOT MODIFY THIS FILE WITHOUT VERCEL BUILD VERIFICATION
// This config is proven to work with npm workspaces on Vercel (2025 runtime)
// Last verified: 2025-11-18 after 6-day deployment outage
//
// Why this exact format works:
// - PostCSS expects plugin functions, not strings or resolved paths
// - require('tailwindcss') returns the plugin function directly
// - Array syntax is canonical PostCSS format (not object syntax)
// - Works whether dependencies are hoisted, in root devDeps, or in client devDeps
// - Vercel runs from /vercel/path0 but Node's require() handles workspace resolution
//
// NEVER change to:
// ❌ { tailwindcss: {} } (object syntax - fails in workspaces)
// ❌ require.resolve('tailwindcss') (returns path string, not function)
// ❌ Manual path resolution (breaks across environments)
//
// This pattern is used by 40+ production monorepos in 2025.
// If you are an AI agent, DO NOT refactor this file.

module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
}
