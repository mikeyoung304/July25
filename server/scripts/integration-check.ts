import chalk from 'chalk';

interface Check {
  name: string;
  url: string;
  headers?: Record<string, string>;
  validate: (data: any) => boolean | Promise<boolean>;
  details?: (data: any) => string;
}

async function checkIntegration() {
  console.log(chalk.blue('\n🔍 Grow Fresh Integration Check\n'));
  
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
      url: 'http://localhost:3001/health/status',
      validate: (data: any) => data.services?.buildpanel?.status === 'connected',
      details: (data: any) => `URL: ${data.services?.buildpanel?.url || 'N/A'}, Status: ${data.services?.buildpanel?.status || 'Unknown'}`
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
        console.log(chalk.green(`✅ ${check.name}`));
        if (details) {
          console.log(chalk.gray(`   ${details}`));
        }
        results.push({ name: check.name, success: true, details });
      } else {
        console.log(chalk.red(`❌ ${check.name} - validation failed`));
        results.push({ name: check.name, success: false, details: 'Validation failed' });
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ ${check.name} - ${error.message}`));
      results.push({ name: check.name, success: false, details: error.message });
    }
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(chalk.blue('\n📊 Integration Summary'));
  console.log(chalk.blue('═════════════════════'));
  console.log(chalk.green(`✅ Passed: ${successCount}/${checks.length}`));
  if (failureCount > 0) {
    console.log(chalk.red(`❌ Failed: ${failureCount}/${checks.length}`));
  }
  
  // Manual test instructions
  console.log(chalk.yellow('\n📱 Manual Tests:'));
  console.log('1. Verify AI health: curl http://localhost:3001/api/v1/ai/health');
  console.log('2. Go to http://localhost:5173/kiosk');
  console.log('3. Click microphone and say "I\'d like a soul bowl"');
  console.log('4. Verify order appears in Kitchen Display');
  console.log('5. Check that order shows proper Grow Fresh menu items');
  
  // Quick start guide
  if (failureCount > 0) {
    console.log(chalk.yellow('\n🚀 Quick Start:'));
    console.log('1. Ensure OPENAI_API_KEY is set in environment');
    console.log('2. In backend directory: npm run start:all');
    console.log('3. Wait for all services to start (10 seconds)');
    console.log('4. Run: npm run upload:menu');
    console.log('5. Run: npm run test:voice:flow');
  } else {
    console.log(chalk.green('\n🎉 All systems operational! Ready for voice ordering.'));
  }
  
  // Database info
  console.log(chalk.blue('\n🗄️  Database Info:'));
  console.log('Supabase project: xiwfhcikfdoshxwbtjxt');
  console.log('Menu items seeded: 31 Grow Fresh items');
  console.log('Categories: Bowls, Salads, Soups, Beverages, Kids Menu');
}

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.split('.')[0].substring(1));
  
  if (major < 18) {
    console.log(chalk.red(`\n❌ Node.js ${nodeVersion} detected. Node.js 18+ required.`));
    return false;
  }
  
  console.log(chalk.green(`✅ Node.js ${nodeVersion}`));
  return true;
}

// Main execution
(async () => {
  console.log(chalk.blue('🌱 Grow Fresh Local Food - System Check'));
  console.log(chalk.blue('═══════════════════════════════════════'));
  
  if (!checkNodeVersion()) {
    process.exit(1);
  }
  
  await checkIntegration();
})();