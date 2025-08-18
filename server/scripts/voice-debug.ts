#!/usr/bin/env tsx
/**
 * Voice System Debug and Diagnostic Script
 * Usage: tsx scripts/voice-debug.ts [command] [options]
 */

import { createClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import chalk from 'chalk';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

// Colors for output
const log = {
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  debug: (msg: string) => console.log(chalk.gray('→'), msg)
};

// Command line arguments
const command = process.argv[2];
const args = process.argv.slice(3);

/**
 * Test OpenAI Realtime API connection
 */
async function testOpenAIConnection(): Promise<void> {
  log.info('Testing OpenAI Realtime API connection...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    log.error('OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    const timeout = setTimeout(() => {
      ws.close();
      log.error('Connection timeout after 10 seconds');
      reject(new Error('Connection timeout'));
    }, 10000);

    ws.on('open', () => {
      log.success('Connected to OpenAI Realtime API');
      
      // Send session update to test
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16'
        }
      }));
    });

    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      if (event.type === 'session.created') {
        log.success(`Session created: ${event.session.id}`);
        clearTimeout(timeout);
        ws.close();
        resolve();
      } else if (event.type === 'error') {
        log.error(`OpenAI error: ${event.error.message}`);
        clearTimeout(timeout);
        ws.close();
        reject(new Error(event.error.message));
      }
    });

    ws.on('error', (error) => {
      log.error(`WebSocket error: ${error.message}`);
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Test Supabase connection and menu data
 */
async function testSupabaseConnection(): Promise<void> {
  log.info('Testing Supabase connection...');
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    log.error('SUPABASE_URL or SUPABASE_SERVICE_KEY not found');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  
  try {
    // Test connection with a simple query
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .limit(1);
    
    if (restaurantError) {
      log.error(`Restaurant query failed: ${restaurantError.message}`);
      return;
    }
    
    log.success(`Connected to Supabase. Found ${restaurants?.length || 0} restaurant(s)`);
    
    if (restaurants && restaurants.length > 0) {
      const restaurantId = restaurants[0].id;
      
      // Check menu items
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, price, available')
        .eq('restaurant_id', restaurantId)
        .eq('available', true)
        .limit(5);
      
      if (menuError) {
        log.error(`Menu query failed: ${menuError.message}`);
        return;
      }
      
      log.success(`Found ${menuItems?.length || 0} available menu items`);
      
      if (menuItems && menuItems.length > 0) {
        log.debug('Sample menu items:');
        menuItems.forEach(item => {
          log.debug(`  - ${item.name}: $${item.price}`);
        });
      }
    }
  } catch (error) {
    log.error(`Supabase test failed: ${error.message}`);
  }
}

/**
 * Test audio format conversion
 */
function testAudioConversion(): void {
  log.info('Testing audio format conversion...');
  
  // Create sample PCM16 audio (1 second of 440Hz tone at 24kHz)
  const sampleRate = 24000;
  const frequency = 440;
  const duration = 1;
  const samples = sampleRate * duration;
  
  const pcm16Buffer = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
    pcm16Buffer.writeInt16LE(Math.round(sample), i * 2);
  }
  
  log.success(`Created ${samples} PCM16 samples (${pcm16Buffer.length} bytes)`);
  
  // Convert to G.711 μ-law
  const ulawBuffer = Buffer.alloc(samples);
  for (let i = 0; i < samples; i++) {
    const pcm16 = pcm16Buffer.readInt16LE(i * 2);
    const ulaw = pcm16ToUlaw(pcm16);
    ulawBuffer[i] = ulaw;
  }
  
  log.success(`Converted to G.711 μ-law (${ulawBuffer.length} bytes)`);
  
  // Convert back to PCM16
  const reconvertedBuffer = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const ulaw = ulawBuffer[i];
    const pcm16 = ulawToPcm16(ulaw);
    reconvertedBuffer.writeInt16LE(pcm16, i * 2);
  }
  
  log.success(`Reconverted to PCM16 (${reconvertedBuffer.length} bytes)`);
  
  // Calculate error
  let totalError = 0;
  for (let i = 0; i < samples * 2; i += 2) {
    const original = pcm16Buffer.readInt16LE(i);
    const reconverted = reconvertedBuffer.readInt16LE(i);
    totalError += Math.abs(original - reconverted);
  }
  
  const avgError = totalError / samples;
  log.info(`Average conversion error: ${avgError.toFixed(2)} (lower is better)`);
  
  if (avgError < 1000) {
    log.success('Audio conversion working correctly');
  } else {
    log.warn('Audio conversion may have issues');
  }
}

// μ-law conversion functions
function pcm16ToUlaw(pcm16: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  const exp_lut = [0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
                   4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
                   5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                   5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
                   7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];
  
  const sign = (pcm16 < 0) ? 0x80 : 0;
  if (sign) pcm16 = -pcm16;
  
  pcm16 = Math.min(pcm16, CLIP);
  pcm16 += BIAS;
  
  const exponent = exp_lut[(pcm16 >> 7) & 0xFF];
  const mantissa = (pcm16 >> (exponent + 3)) & 0x0F;
  
  return ~(sign | (exponent << 4) | mantissa);
}

function ulawToPcm16(ulaw: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  
  ulaw = ~ulaw;
  const sign = (ulaw & 0x80) ? -1 : 1;
  const exponent = (ulaw >> 4) & 0x07;
  const mantissa = ulaw & 0x0F;
  
  let sample = mantissa << (exponent + 3);
  sample += BIAS << (exponent + 2);
  sample *= sign;
  
  return Math.max(-CLIP, Math.min(CLIP, sample));
}

/**
 * Monitor active sessions
 */
async function monitorSessions(): Promise<void> {
  log.info('Monitoring active voice sessions...');
  
  const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
  
  setInterval(async () => {
    try {
      const response = await fetch(`${baseUrl}/voice/sessions`);
      const data = await response.json();
      
      console.clear();
      console.log(chalk.bold.cyan('🎙️  Voice System Monitor'));
      console.log(chalk.gray('─'.repeat(50)));
      
      if (data.sessions.length === 0) {
        console.log(chalk.gray('No active sessions'));
      } else {
        console.log(chalk.green(`Active Sessions: ${data.sessions.length}`));
        console.log();
        
        data.sessions.forEach((session: any) => {
          console.log(chalk.bold(`Session: ${session.sessionId}`));
          console.log(`  Phone: ${session.from}`);
          console.log(`  Duration: ${Math.round(session.duration / 1000)}s`);
          console.log(`  Metrics:`, session.metrics);
          console.log();
        });
      }
      
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.gray('Press Ctrl+C to exit'));
    } catch (error) {
      log.error(`Failed to fetch sessions: ${error.message}`);
    }
  }, 2000);
}

/**
 * Calculate token costs
 */
async function calculateCosts(): Promise<void> {
  log.info('Calculating voice system costs...');
  
  const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
  
  try {
    const response = await fetch(`${baseUrl}/api/voice/debug/metrics`);
    const metrics = await response.json();
    
    // Pricing (as of 2024)
    const TEXT_INPUT_COST = 5 / 1000000;    // $5 per 1M tokens
    const TEXT_OUTPUT_COST = 20 / 1000000;  // $20 per 1M tokens
    const AUDIO_INPUT_COST = 100 / 1000000; // $100 per 1M tokens
    const AUDIO_OUTPUT_COST = 200 / 1000000; // $200 per 1M tokens
    
    // Estimate audio tokens (1 minute ≈ 1600 tokens)
    const avgSessionMinutes = (metrics.averageSessionDuration || 0) / 60000;
    const audioTokensPerSession = avgSessionMinutes * 1600 * 2; // Both input and output
    const totalAudioTokens = audioTokensPerSession * metrics.totalSessions;
    
    const costs = {
      textInput: (metrics.totalTokensUsed || 0) * 0.3 * TEXT_INPUT_COST,
      textOutput: (metrics.totalTokensUsed || 0) * 0.7 * TEXT_OUTPUT_COST,
      audioInput: totalAudioTokens * 0.5 * AUDIO_INPUT_COST,
      audioOutput: totalAudioTokens * 0.5 * AUDIO_OUTPUT_COST
    };
    
    const totalCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    
    console.log(chalk.bold.cyan('💰 Voice System Cost Analysis'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Total Sessions: ${metrics.totalSessions}`);
    console.log(`Average Duration: ${avgSessionMinutes.toFixed(1)} minutes`);
    console.log(`Total Tokens Used: ${(metrics.totalTokensUsed || 0).toLocaleString()}`);
    console.log();
    console.log(chalk.bold('Estimated Costs:'));
    console.log(`  Text Input:   $${costs.textInput.toFixed(4)}`);
    console.log(`  Text Output:  $${costs.textOutput.toFixed(4)}`);
    console.log(`  Audio Input:  $${costs.audioInput.toFixed(4)}`);
    console.log(`  Audio Output: $${costs.audioOutput.toFixed(4)}`);
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold.green(`Total Cost: $${totalCost.toFixed(2)}`));
    
    if (metrics.totalSessions > 0) {
      console.log(chalk.yellow(`Cost per session: $${(totalCost / metrics.totalSessions).toFixed(4)}`));
    }
  } catch (error) {
    log.error(`Failed to calculate costs: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.bold.cyan('🔧 Voice System Debug Tool'));
  console.log(chalk.gray('─'.repeat(50)));

  switch (command) {
    case 'test':
    case 'test-all':
      await testOpenAIConnection();
      await testSupabaseConnection();
      testAudioConversion();
      break;
      
    case 'test-openai':
      await testOpenAIConnection();
      break;
      
    case 'test-supabase':
      await testSupabaseConnection();
      break;
      
    case 'test-audio':
      testAudioConversion();
      break;
      
    case 'monitor':
      await monitorSessions();
      break;
      
    case 'costs':
      await calculateCosts();
      break;
      
    case 'help':
    default:
      console.log('Available commands:');
      console.log('  test-all      - Run all tests');
      console.log('  test-openai   - Test OpenAI connection');
      console.log('  test-supabase - Test Supabase connection');
      console.log('  test-audio    - Test audio conversion');
      console.log('  monitor       - Monitor active sessions');
      console.log('  costs         - Calculate usage costs');
      console.log('  help          - Show this help');
      console.log();
      console.log('Example:');
      console.log('  tsx scripts/voice-debug.ts test-all');
      break;
  }
  
  if (command !== 'monitor') {
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.green('✓ Debug script completed'));
  }
}

// Run the script
main().catch(error => {
  log.error(`Script failed: ${error.message}`);
  process.exit(1);
});