#!/usr/bin/env node

/**
 * CI script to render Mermaid diagrams to SVG
 * Requires @mermaid-js/mermaid-cli to be installed
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIAGRAMS_DIR = path.join(__dirname, '../docs/diagrams');
const DIAGRAMS = [
  {
    input: 'architecture.mmd',
    output: 'architecture.svg',
    config: {
      theme: 'default',
      themeVariables: {
        primaryColor: '#FE5000',
        primaryTextColor: '#fff',
        primaryBorderColor: '#7C0000',
        lineColor: '#5e5e5e',
        secondaryColor: '#006100',
        tertiaryColor: '#fff'
      }
    }
  }
];

function checkMermaidCli() {
  try {
    execSync('npx mmdc --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('❌ @mermaid-js/mermaid-cli not found. Installing...');
    try {
      execSync('npm install --no-save @mermaid-js/mermaid-cli', { stdio: 'inherit' });
      return true;
    } catch (installError) {
      console.error('Failed to install @mermaid-js/mermaid-cli');
      return false;
    }
  }
}

function renderDiagram(diagram) {
  const inputPath = path.join(DIAGRAMS_DIR, diagram.input);
  const outputPath = path.join(DIAGRAMS_DIR, diagram.output);
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    return false;
  }
  
  
  // Create a temporary config file if custom config is provided
  let configPath = null;
  if (diagram.config) {
    configPath = path.join(DIAGRAMS_DIR, '.mermaid-config.json');
    fs.writeFileSync(configPath, JSON.stringify(diagram.config, null, 2));
  }
  
  try {
    const cmd = `npx mmdc -i "${inputPath}" -o "${outputPath}" -b transparent ${configPath ? `-c "${configPath}"` : ''}`;
    execSync(cmd, { stdio: 'inherit' });
    
    // Clean up config file
    if (configPath && fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to render ${diagram.input}:`, error.message);
    
    // Clean up config file on error
    if (configPath && fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    return false;
  }
}

function main() {
  
  // Check if mermaid-cli is available
  if (!checkMermaidCli()) {
    process.exit(1);
  }
  
  // Ensure diagrams directory exists
  if (!fs.existsSync(DIAGRAMS_DIR)) {
    console.error(`❌ Diagrams directory not found: ${DIAGRAMS_DIR}`);
    process.exit(1);
  }
  
  // Render all diagrams
  let successCount = 0;
  let failureCount = 0;
  
  DIAGRAMS.forEach(diagram => {
    if (renderDiagram(diagram)) {
      successCount++;
    } else {
      failureCount++;
    }
  });
  
  // Summary
  
  if (failureCount > 0) {
    process.exit(1);
  }
}

// Run the script
main();