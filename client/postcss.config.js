// PostCSS config with workspace-aware module resolution
// Handles both local dev (hoisted) and Vercel (workspace root dependencies)
module.exports = {
  plugins: {
    [require.resolve('tailwindcss')]: {},
    [require.resolve('autoprefixer')]: {},
  },
}
