import chalk from 'chalk';

const testCases = [
  { input: "I'd like a soul bowl please", expected: "Soul Bowl" },
  { input: "Can I get mom's chicken salad", expected: "Mom's Chicken Salad" },
  { input: "Greek bowl no olives", expected: "Greek Bowl" },
  { input: "Summer vegan bowl", expected: "Summer Vegan Bowl" },
  { input: "Do you have any vegan options", expected: "vegan" },
  { input: "I want a honey bowl with extra seeds", expected: "Honey Bowl" },
  { input: "Give me the protein power bowl", expected: "Protein Power Bowl" },
  { input: "Can I get a green goddess salad", expected: "Green Goddess Salad" }
];

async function testVoiceFlow() {
  console.log(chalk.blue('\n🎤 Testing Voice Order Flow\n'));
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const test of testCases) {
    console.log(chalk.yellow(`Testing: "${test.input}"`));
    
    try {
      const response = await fetch('http://localhost:3001/api/v1/orders/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
        },
        body: JSON.stringify({
          transcription: test.input,
          metadata: { device: 'test-script' }
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        const itemName = result.order?.items?.[0]?.name || 'No item';
        const matchesExpected = itemName.toLowerCase().includes(test.expected.toLowerCase()) ||
                              test.expected.toLowerCase().includes(itemName.toLowerCase());
        
        if (matchesExpected) {
          console.log(chalk.green(`✅ Success! Recognized: ${itemName}`));
          console.log(chalk.gray(`   Confidence: ${result.confidence || 'N/A'}`));
          successCount++;
        } else {
          console.log(chalk.red(`❌ Wrong item: Expected "${test.expected}", got "${itemName}"`));
          failureCount++;
        }
      } else {
        console.log(chalk.red(`❌ Failed: ${result.message || 'Unknown error'}`));
        failureCount++;
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      failureCount++;
    }
    
    console.log('');
  }
  
  // Summary
  console.log(chalk.blue('\n📊 Test Summary'));
  console.log(chalk.blue('═══════════════'));
  console.log(chalk.green(`✅ Passed: ${successCount}`));
  console.log(chalk.red(`❌ Failed: ${failureCount}`));
  console.log(chalk.yellow(`📈 Success Rate: ${Math.round(successCount / testCases.length * 100)}%`));
  
  if (failureCount === 0) {
    console.log(chalk.green('\n🎉 All tests passed! Voice ordering is working correctly.'));
  } else {
    console.log(chalk.yellow('\n⚠️  Some tests failed. Check the AI Gateway configuration.'));
  }
}

// Check if services are running first
async function checkServices() {
  console.log(chalk.blue('🔍 Checking services...\n'));
  
  const services = [
    { name: 'Backend API', url: 'http://localhost:3001/health' },
    { name: 'AI Gateway', url: 'http://localhost:3002/health' }
  ];
  
  let allRunning = true;
  
  for (const service of services) {
    try {
      const response = await fetch(service.url);
      if (response.ok) {
        console.log(chalk.green(`✅ ${service.name} is running`));
      } else {
        console.log(chalk.red(`❌ ${service.name} returned ${response.status}`));
        allRunning = false;
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${service.name} is not running`));
      allRunning = false;
    }
  }
  
  return allRunning;
}

// Main execution
(async () => {
  const servicesRunning = await checkServices();
  
  if (!servicesRunning) {
    console.log(chalk.yellow('\n⚠️  Not all services are running. Please run: npm run start:all'));
    process.exit(1);
  }
  
  // Wait a moment for services to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testVoiceFlow();
})();