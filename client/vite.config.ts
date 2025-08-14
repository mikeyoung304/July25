import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Production safety check
  if (mode === 'production') {
    const apiUrl = env.VITE_API_BASE_URL || '';
    if (/localhost|127\.0\.0\.1/.test(apiUrl)) {
      throw new Error('❌ Production build blocked: VITE_API_BASE_URL points to localhost');
    }
  }
  
  return {
    plugins: [
      react(),
      // Bundle size visualization (only in analyze mode)
      ...(process.env.ANALYZE ? [visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })] : []),
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@rebuild/shared': path.resolve(__dirname, '../shared/index.ts'),
      },
    },
    
    // Load .env files from the root directory
    envDir: '..',
    
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      },
      cors: false
    },
    
    preview: {
      port: 4173,
      strictPort: true
    },
    
    build: {
      // Basic minification without removing console logs
      minify: 'terser',
      
      // Set chunk size warnings
      chunkSizeWarningLimit: 1000, // 1MB
      
      // Simple rollup options
      rollupOptions: {
        output: {
          // Basic vendor chunk splitting
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
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
  };
});