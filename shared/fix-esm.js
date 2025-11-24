#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create ESM wrappers for CommonJS modules
const createESMWrapper = (cjsPath, esmPath, exports) => {
  const moduleVar = path.basename(cjsPath, '.js') + 'Module';
  let content = `// ESM wrapper for CommonJS module\n`;
  content += `import ${moduleVar} from './${path.basename(cjsPath)}';\n\n`;

  exports.forEach(exp => {
    content += `export const ${exp} = ${moduleVar}.${exp};\n`;
  });

  fs.writeFileSync(esmPath, content);
  // ESM wrapper created
};

// Fix browser.esm.js to properly import CommonJS
const fixBrowserESM = () => {
  const content = `// ESM wrapper for browser config
import * as configModule from './index.js';
import * as simpleModule from './simple.js';

const { config: baseConfig } = simpleModule;

// Browser-only config access (Vite / import.meta.env)
function assertBrowser() {
    if (typeof window === 'undefined') {
        throw new Error('shared/config/browser.ts used in non-browser runtime');
    }
}

export function getPublicEnv(key) {
    if (typeof window !== 'undefined') {
        assertBrowser();
    }
    // Vite will transform import.meta.env at build time
    const env = (import.meta && import.meta.env) || {};
    return env[key];
}

// Initialize browser environment only in actual browser
if (typeof window !== 'undefined') {
    const viteEnv = (import.meta && import.meta.env) || {};
    globalThis.__SHARED_CONFIG_VITE_ENV__ = viteEnv;

    const currentProcess = globalThis.process ?? { env: {} };
    const existingEnv = { ...currentProcess.env };

    // Preserve prior NODE_ENV unless Vite provides a mode override
    if (typeof viteEnv.MODE === 'string' && viteEnv.MODE.length > 0) {
        existingEnv.NODE_ENV = viteEnv.MODE;
    } else if (!existingEnv.NODE_ENV) {
        existingEnv.NODE_ENV = 'development';
    }

    for (const [key, value] of Object.entries(viteEnv)) {
        if (key.startsWith('VITE_')) {
            existingEnv[key] = value;
        }
    }

    currentProcess.env = existingEnv;
    globalThis.process = currentProcess;
}

export const browserConfig = baseConfig;

// Re-export from index
export const getConfig = configModule.getConfig;
export const validateConfig = configModule.validateConfig;
export const getApiUrl = configModule.getApiUrl;
export const getWsUrl = configModule.getWsUrl;
export const configService = configModule.configService;
`;

  fs.writeFileSync(path.join(__dirname, 'dist/config/browser.esm.js'), content);
  // browser.esm.js fixed
};

// Main
const distDir = path.join(__dirname, 'dist');

// Fix business.esm.js
createESMWrapper(
  path.join(distDir, 'constants/business.js'),
  path.join(distDir, 'constants/business.esm.js'),
  ['DEFAULT_TAX_RATE', 'DEFAULT_TIP_PERCENTAGES', 'MIN_ORDER_AMOUNT', 'PAYMENT_ROUNDING_TOLERANCE_CENTS', 'TAX_RATE_SOURCE']
);

// Fix browser.esm.js
fixBrowserESM();

// ESM wrappers created successfully