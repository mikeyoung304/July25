import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle size visualization (only in analyze mode)
    process.env.ANALYZE && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Load .env files from the root directory
  envDir: '..',
  
  server: {
    // Allow Vite to find an available port if 5173 is in use
    strictPort: false
  },
  
  build: {
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
      },
    },
    
    // Set chunk size warnings
    chunkSizeWarningLimit: 1000, // 1MB
    
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
          
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          
          // Date/time utilities
          'date-vendor': ['date-fns'],
          
          // Form libraries
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
        
        // Consistent chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-${facadeModuleId}-[hash].js`;
        },
        
        // Asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/woff|woff2|ttf|otf|eot/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Enable source maps for production debugging
    sourcemap: true,
    
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096, // 4kb
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: ['@rebuild/shared'],
  },
  
  // CSS optimization
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
})