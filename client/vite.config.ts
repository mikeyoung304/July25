import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load from .env files
  const fileEnv = loadEnv(mode, process.cwd(), '');
  
  // In production, prefer process.env (from Vercel) over file env
  const env = mode === 'production' ? 
    { ...fileEnv, ...process.env } : 
    fileEnv;
  
  // Production safety check
  if (mode === 'production') {
    const apiUrl = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || '';
    if (/localhost|127\.0\.0\.1/.test(apiUrl)) {
      throw new Error('❌ Production build blocked: VITE_API_BASE_URL points to localhost');
    }
    // Log what we're using (will show in Vercel build logs)
    console.log('🔧 Building with VITE_API_BASE_URL:', apiUrl || 'NOT SET!');
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
    
    // Optimize build output
    build: {
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      
      // Code splitting configuration
      rollupOptions: {
        output: {
          // Manual chunks temporarily disabled to fix build
          // TODO: Re-enable after verifying all dependencies are installed
          /*manualChunks: {
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // Supabase and auth
            'supabase': ['@supabase/supabase-js'],
            
            // UI components
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
            ],
            
            // Charts and data visualization
            'charts': ['recharts'],
            
            // Utilities
            'utils': ['date-fns', 'clsx'],
          },*/
          
          // Optimize chunk size
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `js/[name]-${facadeModuleId}-[hash].js`;
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name?.split('.').pop() || 'asset';
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
              return `fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      
      // Set chunk size warnings
      chunkSizeWarningLimit: 500, // 500kb warning threshold
      
      // Enable source maps for production debugging
      sourcemap: mode === 'development' ? 'inline' : false,
      
      // Target modern browsers for smaller bundles
      target: 'es2020',
      
      // Enable CSS code splitting
      cssCodeSplit: true,
      
      // Optimize deps
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
      ],
      exclude: ['@rebuild/shared'], // Exclude workspace packages
    },
    
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
    
    // Duplicate build config removed - merged with first build config above
    /*build: {
      // Basic minification without removing console logs
      minify: 'terser',
      
      // Set chunk size warnings
      chunkSizeWarningLimit: 1000, // 1MB
      
      // Simple rollup options
      rollupOptions: {
        output: {
          // Improved chunk splitting
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', '@radix-ui/react-slot', 'clsx', 'framer-motion'],
            supabase: ['@supabase/supabase-js'],
            utils: ['tailwind-merge', 'class-variance-authority'],
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
    },*/
    
    // Duplicate optimizeDeps removed - merged with first optimizeDeps above
    /*optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'lucide-react',
      ],
      exclude: ['@rebuild/shared'],
    },*/
    
    // CSS optimization
    css: {
      devSourcemap: true,
      modules: {
        localsConvention: 'camelCase',
      },
    },
  };
});