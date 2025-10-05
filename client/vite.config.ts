import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // IMPORTANT: Load .env from ROOT directory (monorepo setup)
  // This allows ONE .env file to serve both server and client
  const envDir = fileURLToPath(new URL('../', import.meta.url))

  // Load from .env files (only VITE_ prefixed vars will be exposed to browser)
  const fileEnv = loadEnv(mode, envDir, 'VITE_');

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
          // CRITICAL: Manual chunks prevent memory explosion
          manualChunks: (id) => {
            // node_modules chunks - more aggressive splitting
            if (id.includes('node_modules')) {
              // IMPORTANT: Keep React and React-DOM together to prevent forwardRef issues
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'react-bundle'; // Bundle React core together
              }
              if (id.includes('react-router')) {
                return 'react-router'; // Separate router
              }
              if (id.includes('react') && !id.includes('react-hot-toast')) {
                return 'react-libs'; // Other React libraries
              }
              
              // Supabase split into auth and client
              if (id.includes('@supabase/auth')) {
                return 'supabase-auth';
              }
              if (id.includes('supabase')) {
                return 'supabase-client';
              }
              
              // Square payments
              if (id.includes('square')) {
                return 'square-vendor';
              }
              
              // UI libraries split
              if (id.includes('react-hot-toast')) {
                return 'ui-toast';
              }
              if (id.includes('framer-motion')) {
                return 'ui-animation';
              }
              if (id.includes('@headlessui') || id.includes('clsx')) {
                return 'ui-core';
              }
              
              // Date/time utilities
              if (id.includes('date-fns') || id.includes('dayjs')) {
                return 'date-vendor';
              }
              
              // Form libraries
              if (id.includes('react-hook-form') || id.includes('yup') || id.includes('joi')) {
                return 'form-vendor';
              }
              
              // Monitoring and analytics
              if (id.includes('sentry') || id.includes('@sentry')) {
                return 'monitoring';
              }
              
              // All other vendor code - split into smaller chunks
              if (id.includes('lodash')) {
                return 'utils-lodash';
              }
              if (id.includes('axios') || id.includes('ky')) {
                return 'http-client';
              }
              
              return 'vendor';
            }
            
            // Split large components into separate chunks
            if (id.includes('WebRTCVoiceClient')) {
              return 'voice-client';
            }
            if (id.includes('FloorPlanEditor')) {
              return 'floor-plan';
            }
            if (id.includes('modules/order-system')) {
              return 'order-system';
            }
            if (id.includes('modules/voice')) {
              return 'voice-module';
            }
            if (id.includes('modules/analytics')) {
              return 'analytics';
            }
            if (id.includes('modules/payments')) {
              return 'payments';
            }
          },
          
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
      
      // Disable source maps in CI to reduce memory usage
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
    
    // Optimize dependencies - ensure React is properly bundled
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router-dom',
        '@supabase/supabase-js',
      ],
      exclude: ['@rebuild/shared'], // Exclude workspace packages
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@rebuild/shared': path.resolve(__dirname, '../shared/dist'),
        '/shared': path.resolve(__dirname, '../shared/src'),
        '@shared': path.resolve(__dirname, '../shared/src'),
      },
    },
    
    // Load .env files from ROOT directory (monorepo setup)
    envDir,

    // Only expose VITE_ prefixed variables to the browser
    envPrefix: 'VITE_',

    // Define global constants
    define: {
      'import.meta.env.VITE_DEMO_PANEL': JSON.stringify('1'), // Always show demo panel on this demo site
      'globalThis.process': JSON.stringify({ env: {} }),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || mode)
    },
    
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
      cors: false,
      headers: {
        // Cache images for 1 year in production, 1 hour in dev
        'Cache-Control': mode === 'production' 
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600'
      }
    },
    
    preview: {
      port: 4173,
      strictPort: true
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
