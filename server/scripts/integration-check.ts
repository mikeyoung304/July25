import chalk from 'chalk';

interface Check {
  name: string;
  url: string;
  headers?: Record<string, string>;
  validate: (data: any) => boolean | Promise<boolean>;
  details?: (data: any) => string;
}

async function checkIntegration() {
  
  const checks: Check[] = [
    {
      name: 'Backend Health',
      url: 'http://localhost:3001/health',
      validate: (data: any) => data.status === 'ok',
      details: (data: any) => `Version: ${data.version || 'N/A'}, Uptime: ${data.uptime || 'N/A'}`
    },
    {
      name: 'Menu API',
      url: 'http://localhost:3001/api/v1/menu',
      headers: { 'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111' },
      validate: (data: any) => data.items?.length > 0,
      details: (data: any) => `${data.items?.length || 0} items, ${data.categories?.length || 0} categories`
    },
    {
      name: 'OpenAI API',
      url: 'http://localhost:3001/api/v1/ai/provider-health',
      validate: (data: any) => data.ok === true,
      details: (data: any) => `Model: ${data.model || 'N/A'}, Status: ${data.ok ? 'Connected' : 'Disconnected'}`
    },
    {
      name: 'AI Service',
      url: 'http://localhost:3001/api/v1/ai/health',
      validate: (data: any) => data.status === 'ok',
      details: (data: any) => `Menu loaded: ${data.hasMenu ? 'Yes' : 'No'}, Items: ${data.menuItems || 0}`
    },
    {
      name: 'Frontend',
      url: 'http://localhost:5173',
      validate: (text: string) => text.includes('Grow Fresh') || text.includes('Restaurant OS'),
      details: () => 'React app loaded'
    },
    {
      name: 'Voice Endpoint',
      url: 'http://localhost:3001/api/v1/orders/voice',
      headers: { 'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111' },
      validate: async (response: Response) => {
        // For OPTIONS request, just check if it's allowed
        return response.status === 405 || response.status === 200;
      },
      details: () => 'Voice ordering endpoint available'
    }
  ];
  
  const results: Array<{ name: string; success: boolean; details: string }> = [];
  
  for (const check of checks) {
    try {
      const response = await fetch(check.url, {
        headers: check.headers
      });
      
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/html')) {
        data = await response.text();
      } else {
        data = response;
      }
      
      const isValid = await check.validate(data);
      const details = check.details ? check.details(data) : '';
      
      if (isValid) {
        if (details) {
        }
        results.push({ name: check.name, success: true, details });
      } else {
        results.push({ name: check.name, success: false, details: 'Validation failed' });
      }
    } catch (error: any) {
      results.push({ name: check.name, success: false, details: error.message });
    }
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  if (failureCount > 0) {
  }
  
  // Manual test instructions
  
  // Quick start guide
  if (failureCount > 0) {
  } else {
  }
  
  // Database info
}

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.split('.')[0].substring(1));
  
  if (major < 18) {
    return false;
  }
  
  return true;
}

// Main execution
(async () => {
  
  if (!checkNodeVersion()) {
    process.exit(1);
  }
  
  await checkIntegration();
})();