#!/usr/bin/env tsx

/**
 * Bundle Analysis Script
 * Analyzes bundle sizes, dependencies, and performance metrics
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

interface BundleAnalysis {
  timestamp: number;
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    files: string[];
  }>;
  assets: Array<{
    name: string;
    size: number;
    type: 'js' | 'css' | 'other';
  }>;
  dependencies: {
    production: number;
    development: number;
    total: number;
    heaviest: Array<{
      name: string;
      size: string;
      bundleImpact?: number;
    }>;
  };
  recommendations: string[];
  trends?: {
    sizeChange: number;
    performanceImpact: 'positive' | 'negative' | 'neutral';
  };
}

class BundleAnalyzer {
  private rootDir: string;
  private outputDir: string;

  constructor() {
    this.rootDir = process.cwd();
    this.outputDir = join(this.rootDir, 'docs/analysis');
    
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      require('fs').mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public async analyzeAll(): Promise<BundleAnalysis> {
    console.log('📊 Starting comprehensive bundle analysis...');

    const analysis: BundleAnalysis = {
      timestamp: Date.now(),
      totalSize: 0,
      gzippedSize: 0,
      chunks: [],
      assets: [],
      dependencies: {
        production: 0,
        development: 0,
        total: 0,
        heaviest: []
      },
      recommendations: []
    };

    try {
      // Build the client for analysis
      console.log('🔨 Building client for analysis...');
      await this.buildForAnalysis();

      // Analyze bundle composition
      console.log('🔍 Analyzing bundle composition...');
      await this.analyzeBundleComposition(analysis);

      // Analyze dependencies
      console.log('📦 Analyzing dependencies...');
      await this.analyzeDependencies(analysis);

      // Generate recommendations
      console.log('💡 Generating recommendations...');
      this.generateRecommendations(analysis);

      // Compare with previous analysis
      await this.compareWithPrevious(analysis);

      // Save analysis results
      await this.saveAnalysis(analysis);

      // Generate visual reports
      await this.generateVisualReports();

      console.log('✅ Bundle analysis completed successfully!');
      console.log(`📂 Results saved to: ${this.outputDir}`);

      return analysis;

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw error;
    }
  }

  private async buildForAnalysis(): Promise<void> {
    const clientDir = join(this.rootDir, 'client');
    
    try {
      execSync('npm run build', {
        cwd: clientDir,
        stdio: 'pipe',
        env: { ...process.env, ANALYZE_BUNDLE: 'true' }
      });
    } catch (error) {
      console.warn('⚠️ Build failed, attempting fallback analysis...');
      
      // Try to analyze existing build if available
      const distDir = join(clientDir, 'dist');
      if (!existsSync(distDir)) {
        throw new Error('No build available for analysis. Run npm run build first.');
      }
    }
  }

  private async analyzeBundleComposition(analysis: BundleAnalysis): Promise<void> {
    const clientDistDir = join(this.rootDir, 'client/dist');
    
    if (!existsSync(clientDistDir)) {
      console.warn('⚠️ Client dist directory not found, skipping bundle analysis');
      return;
    }

    // Analyze assets
    const assets = this.getAssets(clientDistDir);
    analysis.assets = assets;
    analysis.totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);

    // Estimate gzipped size (roughly 70% of original for text files)
    analysis.gzippedSize = Math.round(
      assets.reduce((sum, asset) => {
        const compressionRatio = asset.type === 'js' || asset.type === 'css' ? 0.3 : 0.8;
        return sum + (asset.size * compressionRatio);
      }, 0)
    );

    // Analyze chunks (simplified for Vite builds)
    const jsAssets = assets.filter(a => a.type === 'js');
    analysis.chunks = jsAssets.map(asset => ({
      name: asset.name,
      size: asset.size,
      files: [asset.name]
    }));
  }

  private getAssets(distDir: string): BundleAnalysis['assets'] {
    const assets: BundleAnalysis['assets'] = [];
    
    const scanDirectory = (dir: string, basePath: string = '') => {
      const items = require('fs').readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, join(basePath, item));
        } else {
          const relativePath = join(basePath, item);
          const extension = item.split('.').pop()?.toLowerCase();
          
          let type: 'js' | 'css' | 'other' = 'other';
          if (extension === 'js' || extension === 'mjs') type = 'js';
          else if (extension === 'css') type = 'css';
          
          assets.push({
            name: relativePath,
            size: stat.size,
            type
          });
        }
      }
    };
    
    scanDirectory(distDir);
    return assets.sort((a, b) => b.size - a.size);
  }

  private async analyzeDependencies(analysis: BundleAnalysis): Promise<void> {
    try {
      // Analyze package.json
      const packageJsonPath = join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      const prodDeps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});

      analysis.dependencies.production = prodDeps.length;
      analysis.dependencies.development = devDeps.length;
      analysis.dependencies.total = prodDeps.length + devDeps.length;

      // Get dependency sizes (requires npm ls --json which can be slow)
      try {
        const lsOutput = execSync('npm ls --json --depth=0', {
          stdio: 'pipe',
          cwd: this.rootDir
        }).toString();
        
        const lsData = JSON.parse(lsOutput);
        const heaviest: Array<{ name: string; size: string }> = [];
        
        // This is simplified - in practice you'd use a tool like bundle-phobia API
        for (const dep of prodDeps.slice(0, 10)) {
          try {
            const nodeModulesPath = join(this.rootDir, 'node_modules', dep);
            if (existsSync(nodeModulesPath)) {
              const size = this.getDirectorySize(nodeModulesPath);
              heaviest.push({
                name: dep,
                size: this.formatBytes(size)
              });
            }
          } catch (error) {
            // Skip if we can't analyze this dependency
          }
        }
        
        analysis.dependencies.heaviest = heaviest
          .sort((a, b) => this.parseSize(b.size) - this.parseSize(a.size))
          .slice(0, 5);

      } catch (error) {
        console.warn('⚠️ Could not analyze dependency sizes:', error);
      }

    } catch (error) {
      console.warn('⚠️ Could not analyze dependencies:', error);
    }
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    
    const items = require('fs').readdirSync(dirPath);
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        totalSize += this.getDirectorySize(fullPath);
      } else {
        totalSize += stat.size;
      }
    }
    
    return totalSize;
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/);
    if (!match) return 0;
    
    const [, value, unit] = match;
    return parseFloat(value) * (units[unit] || 1);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private generateRecommendations(analysis: BundleAnalysis): void {
    const recommendations: string[] = [];
    
    // Size-based recommendations
    if (analysis.totalSize > 2 * 1024 * 1024) { // > 2MB
      recommendations.push('🚨 Bundle size is large (>2MB). Consider code splitting and lazy loading.');
    }
    
    if (analysis.gzippedSize > 500 * 1024) { // > 500KB gzipped
      recommendations.push('⚠️ Gzipped size is significant (>500KB). Review large dependencies.');
    }
    
    // Asset-based recommendations
    const largeAssets = analysis.assets.filter(asset => asset.size > 500 * 1024);
    if (largeAssets.length > 0) {
      recommendations.push(`📦 ${largeAssets.length} assets are >500KB: ${largeAssets.map(a => a.name).join(', ')}`);
    }
    
    // Dependency-based recommendations
    if (analysis.dependencies.total > 50) {
      recommendations.push(`📚 High dependency count (${analysis.dependencies.total}). Consider consolidating.`);
    }
    
    if (analysis.dependencies.production > 30) {
      recommendations.push(`🏭 Many production dependencies (${analysis.dependencies.production}). Audit necessity.`);
    }
    
    // Performance recommendations
    const jsSize = analysis.assets
      .filter(a => a.type === 'js')
      .reduce((sum, a) => sum + a.size, 0);
    
    if (jsSize > 1.5 * 1024 * 1024) {
      recommendations.push('⚡ JavaScript bundle is large. Implement code splitting and tree shaking.');
    }
    
    const cssSize = analysis.assets
      .filter(a => a.type === 'css')
      .reduce((sum, a) => sum + a.size, 0);
    
    if (cssSize > 200 * 1024) {
      recommendations.push('🎨 CSS bundle is large. Consider critical CSS extraction and purging.');
    }
    
    // General recommendations
    recommendations.push('💡 Use dynamic imports for feature-based code splitting');
    recommendations.push('🗜️ Enable Brotli compression for better performance');
    recommendations.push('🖼️ Optimize images with WebP format and lazy loading');
    recommendations.push('🧹 Run bundle analysis regularly to catch size regressions');
    
    analysis.recommendations = recommendations;
  }

  private async compareWithPrevious(analysis: BundleAnalysis): Promise<void> {
    const previousPath = join(this.outputDir, 'bundle-analysis.json');
    
    if (existsSync(previousPath)) {
      try {
        const previousData: BundleAnalysis = JSON.parse(readFileSync(previousPath, 'utf8'));
        const sizeChange = analysis.totalSize - previousData.totalSize;
        const changePercent = (sizeChange / previousData.totalSize) * 100;
        
        analysis.trends = {
          sizeChange: Math.round(changePercent * 100) / 100,
          performanceImpact: changePercent > 10 ? 'negative' : changePercent < -5 ? 'positive' : 'neutral'
        };
        
        if (Math.abs(changePercent) > 5) {
          const direction = changePercent > 0 ? 'increased' : 'decreased';
          analysis.recommendations.unshift(
            `📈 Bundle size ${direction} by ${Math.abs(changePercent).toFixed(1)}% since last analysis`
          );
        }
        
      } catch (error) {
        console.warn('⚠️ Could not compare with previous analysis:', error);
      }
    }
  }

  private async saveAnalysis(analysis: BundleAnalysis): Promise<void> {
    // Save detailed JSON
    const jsonPath = join(this.outputDir, 'bundle-analysis.json');
    writeFileSync(jsonPath, JSON.stringify(analysis, null, 2));
    
    // Save human-readable report
    const reportPath = join(this.outputDir, 'bundle-report.md');
    const report = this.generateMarkdownReport(analysis);
    writeFileSync(reportPath, report);
    
    // Save historical data
    const historyPath = join(this.outputDir, 'bundle-history.jsonl');
    const historyEntry = {
      timestamp: analysis.timestamp,
      totalSize: analysis.totalSize,
      gzippedSize: analysis.gzippedSize,
      assetCount: analysis.assets.length,
      trends: analysis.trends
    };
    
    require('fs').appendFileSync(historyPath, JSON.stringify(historyEntry) + '\n');
  }

  private generateMarkdownReport(analysis: BundleAnalysis): string {
    const date = new Date(analysis.timestamp).toISOString();
    
    let report = `# Bundle Analysis Report\n\n`;
    report += `**Generated:** ${date}\n\n`;
    
    // Summary
    report += `## 📊 Summary\n\n`;
    report += `- **Total Size:** ${this.formatBytes(analysis.totalSize)}\n`;
    report += `- **Gzipped Size:** ${this.formatBytes(analysis.gzippedSize)}\n`;
    report += `- **Assets:** ${analysis.assets.length}\n`;
    report += `- **Chunks:** ${analysis.chunks.length}\n\n`;
    
    if (analysis.trends) {
      const emoji = analysis.trends.performanceImpact === 'positive' ? '📈' : 
                   analysis.trends.performanceImpact === 'negative' ? '📉' : '➡️';
      report += `**Size Change:** ${emoji} ${analysis.trends.sizeChange > 0 ? '+' : ''}${analysis.trends.sizeChange}%\n\n`;
    }
    
    // Largest Assets
    report += `## 📦 Largest Assets\n\n`;
    const topAssets = analysis.assets.slice(0, 10);
    report += `| File | Size | Type |\n`;
    report += `|------|------|------|\n`;
    for (const asset of topAssets) {
      report += `| ${asset.name} | ${this.formatBytes(asset.size)} | ${asset.type} |\n`;
    }
    report += `\n`;
    
    // Dependencies
    report += `## 📚 Dependencies\n\n`;
    report += `- **Production:** ${analysis.dependencies.production}\n`;
    report += `- **Development:** ${analysis.dependencies.development}\n`;
    report += `- **Total:** ${analysis.dependencies.total}\n\n`;
    
    if (analysis.dependencies.heaviest.length > 0) {
      report += `### Heaviest Dependencies\n\n`;
      for (const dep of analysis.dependencies.heaviest) {
        report += `- **${dep.name}:** ${dep.size}\n`;
      }
      report += `\n`;
    }
    
    // Recommendations
    report += `## 💡 Recommendations\n\n`;
    for (const rec of analysis.recommendations) {
      report += `- ${rec}\n`;
    }
    report += `\n`;
    
    // Asset Breakdown
    report += `## 🔍 Asset Breakdown\n\n`;
    const byType = analysis.assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.size;
      return acc;
    }, {} as Record<string, number>);
    
    report += `| Type | Total Size | Percentage |\n`;
    report += `|------|-----------|------------|\n`;
    for (const [type, size] of Object.entries(byType)) {
      const percentage = ((size / analysis.totalSize) * 100).toFixed(1);
      report += `| ${type.toUpperCase()} | ${this.formatBytes(size)} | ${percentage}% |\n`;
    }
    
    return report;
  }

  private async generateVisualReports(): Promise<void> {
    console.log('📊 Generating visual bundle analysis...');
    
    try {
      // Use vite-bundle-analyzer for client
      const clientDir = join(this.rootDir, 'client');
      execSync('npx vite-bundle-analyzer --analyze-size', {
        cwd: clientDir,
        stdio: 'pipe'
      });
      
      console.log('✓ Visual bundle analysis generated');
    } catch (error) {
      console.warn('⚠️ Visual bundle analysis failed:', error);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Bundle Analyzer

Usage: npm run analyze:bundle [options]

Options:
  --help     Show this help message

This script analyzes the application bundle size, dependencies, and generates
recommendations for optimization.

Output files:
  - docs/analysis/bundle-analysis.json    # Detailed analysis data
  - docs/analysis/bundle-report.md        # Human-readable report
  - docs/analysis/bundle-history.jsonl    # Historical size data
    `);
    process.exit(0);
  }
  
  const analyzer = new BundleAnalyzer();
  const analysis = await analyzer.analyzeAll();
  
  console.log('\n📊 Bundle Analysis Results:');
  console.log(`Total Size: ${analysis.totalSize} bytes`);
  console.log(`Gzipped: ${analysis.gzippedSize} bytes`);
  console.log(`Assets: ${analysis.assets.length}`);
  console.log(`Recommendations: ${analysis.recommendations.length}`);
  
  if (analysis.trends) {
    console.log(`Size Change: ${analysis.trends.sizeChange > 0 ? '+' : ''}${analysis.trends.sizeChange}%`);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Bundle analysis failed:', error);
    process.exit(1);
  });
}

export { BundleAnalyzer };