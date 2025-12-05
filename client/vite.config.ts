import { defineConfig, loadEnv, type UserConfig } from 'vite'
import type { PreRenderedChunk, PreRenderedAsset } from 'rollup'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
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
  // Skip strict validation in CI environments (GitHub Actions smoke tests)
  // Enforce strict validation only for actual deployments (Vercel/production)
  if (mode === 'production' && !process.env.CI) {
    const requiredEnvVars = [
      'VITE_API_BASE_URL',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ];

    const missingVars = requiredEnvVars.filter(varName => !env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables for production build:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      throw new Error('Cannot build without required environment variables');
    }

    // Log what we're using (will show in Vercel build logs)
  } else if (mode === 'production' && process.env.CI) {
    console.warn('⚠️  CI environment detected - skipping strict env validation');
    console.warn('   Production builds on Vercel will still enforce strict validation');
  }
  
  // Conditionally load visualizer only when ANALYZE is set
  const analyzePlugins = [];
  if (process.env.ANALYZE) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    analyzePlugins.push(visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }));
  }

  return {
    plugins: [
      react(),
      // Bundle size visualization (only in analyze mode)
      ...analyzePlugins,
    ],
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      
      rollupOptions: {
        output: {
          // CRITICAL: Manual chunks prevent memory explosion
          manualChunks: (id: string) => {
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
              if (id.includes('@supabase')) {
                return 'supabase-client';
              }
              
              // Square vendor
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
              
              // Date libraries
              if (id.includes('date-fns') || id.includes('dayjs')) {
                return 'date-vendor';
              }
              
              // Form libraries
              if (id.includes('react-hook-form') || id.includes('yup') || id.includes('joi')) {
                return 'form-vendor';
              }
              
              // Monitoring and analytics
              if (id.includes('sentry') || id.includes('@sentry')) {
                return 'monitoring-vendor';
              }
              
              // Other vendor code
              return 'vendor';
            }
          },
          
          // Chunk file naming
          chunkFileNames: (chunkInfo: PreRenderedChunk) => {
            const facadeModuleId = chunkInfo.name || 'chunk';
            return `js/[name]-${facadeModuleId}-[hash].js`;
          },
          
          // Entry file naming
          entryFileNames: (chunkInfo: PreRenderedChunk) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? 
              chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `js/[name]-${facadeModuleId}-[hash].js`;
          },
          
          // Asset file naming
          assetFileNames: (assetInfo: PreRenderedAsset) => {
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

      // Target modern browsers for smaller bundles
      target: 'es2020',
      
      // Enable CSS code splitting
      cssCodeSplit: true,
      
      // Optimize deps
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [
          /node_modules/,
          /shared\/dist/,  // Include shared dist files for CommonJS transformation
        ],
        defaultIsModuleExports: true,
      },
    },
    
    // Optimize dependencies - ensure React is properly bundled
    // CRITICAL FIX: Removed 'react/jsx-dev-runtime' to prevent jsxDEV error in production
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        // NOTE: 'react/jsx-dev-runtime' removed - causes production build errors
        'react-router-dom',
        '@supabase/supabase-js',
        '@rebuild/shared/constants/business',
        '@rebuild/shared/config',
      ],
      exclude: [], // Remove workspace exclusion to allow CommonJS transformation
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Removed @rebuild/shared alias to use package.json exports
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
      // Demo panel: enabled by default in dev, opt-in for production via VITE_DEMO_PANEL=1
      // This allows demo mode on staging/preview deployments while keeping production secure
      'import.meta.env.VITE_DEMO_PANEL': JSON.stringify(
        env.VITE_DEMO_PANEL || (mode === 'development' ? '1' : '0')
      ),
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