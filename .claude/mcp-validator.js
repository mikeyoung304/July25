#!/usr/bin/env node
/**
 * MCP Configuration Validator
 * Validates MCP server configurations and ensures consistency
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILES = {
    project: '.mcp.json',
    claude: '.claude/settings.json',
    desktop: path.join(process.env.HOME, 'Library/Application Support/Claude/claude_desktop_config.json')
};

const EXPECTED_SERVERS = {
    project: ['filesystem', 'sequential-thinking', 'memory', 'git'],
    desktop: ['zen', 'supabase', 'github', 'memory-global']
};

function validateConfig() {
    console.log('🔍 MCP Configuration Validator');
    console.log('==============================\n');
    
    let errors = [];
    let warnings = [];
    
    // Validate project configuration
    try {
        const projectConfig = JSON.parse(fs.readFileSync(CONFIG_FILES.project, 'utf8'));
        const projectServers = Object.keys(projectConfig.mcpServers || {});
        
        console.log(`✅ Project config found: ${projectServers.length} servers`);
        
        EXPECTED_SERVERS.project.forEach(server => {
            if (!projectServers.includes(server)) {
                errors.push(`Missing project server: ${server}`);
            } else {
                console.log(`   • ${server} ✓`);
            }
        });
        
    } catch (error) {
        errors.push(`Project config error: ${error.message}`);
    }
    
    // Validate desktop configuration
    try {
        const desktopConfig = JSON.parse(fs.readFileSync(CONFIG_FILES.desktop, 'utf8'));
        const desktopServers = Object.keys(desktopConfig.mcpServers || {});
        
        console.log(`\n✅ Desktop config found: ${desktopServers.length} servers`);
        
        EXPECTED_SERVERS.desktop.forEach(server => {
            if (!desktopServers.includes(server)) {
                warnings.push(`Recommended desktop server missing: ${server}`);
            } else {
                console.log(`   • ${server} ✓`);
            }
        });
        
    } catch (error) {
        warnings.push(`Desktop config warning: ${error.message}`);
    }
    
    // Validate Claude settings
    try {
        const claudeSettings = JSON.parse(fs.readFileSync(CONFIG_FILES.claude, 'utf8'));
        
        if (claudeSettings.mcp && claudeSettings.mcp.enabled) {
            console.log('\n✅ Claude settings: MCP enabled');
        } else {
            warnings.push('Claude settings: MCP not explicitly enabled');
        }
        
    } catch (error) {
        warnings.push(`Claude settings warning: ${error.message}`);
    }
    
    // Report results
    console.log('\n📊 Validation Results:');
    console.log('======================');
    
    if (errors.length === 0) {
        console.log('✅ No critical errors found');
    } else {
        console.log('❌ Critical Errors:');
        errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log('\n🎉 Perfect! All MCP configurations are valid and complete.');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

if (require.main === module) {
    validateConfig();
}

module.exports = { validateConfig };