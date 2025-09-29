import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { globby } from 'globby';
import chalk from 'chalk';
import simpleGit, { SimpleGit } from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';

import { MeteorUpgradeConfig } from './config';
import { pluginRegistry } from './plugin-registry';
import { TransformResult } from './types';
import * as plugins from './plugins';

const execAsync = promisify(exec);

export class MeteorUpgrader {
  private config: MeteorUpgradeConfig;
  private git: SimpleGit;
  private results: TransformResult[] = [];
  
  constructor(config: MeteorUpgradeConfig) {
    this.config = config;
    this.git = simpleGit();
    this.registerPlugins();
  }
  
  private registerPlugins(): void {
    // Register all available plugins
    if (this.config.transforms?.asyncApi !== false) {
      pluginRegistry.register(new plugins.AsyncApiPlugin());
    }
    if (this.config.transforms?.cursors !== false) {
      pluginRegistry.register(new plugins.CursorAsyncPlugin());
    }
    if (this.config.transforms?.meteorCall !== false) {
      pluginRegistry.register(new plugins.MeteorCallAsyncPlugin());
    }
    if (this.config.transforms?.meteorUser !== false) {
      pluginRegistry.register(new plugins.MeteorUserAsyncPlugin());
    }
    if (this.config.transforms?.callbacks !== false) {
      pluginRegistry.register(new plugins.CallbackToAwaitPlugin());
    }
  }
  
  async run(): Promise<void> {
    console.log(chalk.blue('🔍 Starting Meteor 2.x → 3.x upgrade process\n'));
    
    try {
      // Setup git if needed
      await this.setupGit();
      
      // Find files to process
      const files = await this.findFiles();
      console.log(chalk.gray(`Found ${files.length} files to process\n`));
      
      if (files.length === 0) {
        console.log(chalk.yellow('No files found to process. Check your input patterns.'));
        return;
      }
      
      // Process files
      await this.processFiles(files);
      
      // Post-process: format, lint, etc.
      if (this.config.write) {
        await this.postProcess();
      }
      
      // Generate report
      if (this.config.report) {
        await this.generateReport();
      }
      
      // Commit changes
      if (this.config.commit && this.config.write) {
        await this.commitChanges();
      }
      
      this.printSummary();
      
    } catch (error) {
      throw new Error(`Upgrade process failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  
  private async setupGit(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    
    if (!isRepo && this.config.initRepo) {
      console.log(chalk.blue('📦 Initializing git repository...'));
      await this.git.init();
    }
    
    if (isRepo || this.config.initRepo) {
      if (this.config.branch) {
        console.log(chalk.blue(`🌿 Creating and switching to branch: ${this.config.branch}`));
        await this.git.checkoutLocalBranch(this.config.branch);
      }
    }
  }
  
  private async findFiles(): Promise<string[]> {
    const patterns = this.config.input || [];
    const ignore = this.config.exclude || [];
    
    console.log(chalk.gray(`Searching with patterns: ${patterns.join(', ')}`));
    console.log(chalk.gray(`Excluding: ${ignore.join(', ')}`));
    
    return await globby(patterns, {
      ignore,
      absolute: true,
      onlyFiles: true
    });
  }
  
  private async processFiles(files: string[]): Promise<void> {
    const registeredPlugins = pluginRegistry.getAll();
    console.log(chalk.blue(`🔧 Running ${registeredPlugins.length} transform plugins:\n`));
    
    registeredPlugins.forEach(plugin => {
      console.log(chalk.gray(`  • ${plugin.name}: ${plugin.description}`));
    });
    console.log();
    
    for (const file of files) {
      await this.processFile(file);
    }
  }
  
  private async processFile(filePath: string): Promise<void> {
    try {
      const source = await fs.readFile(filePath, 'utf-8');
      let currentSource = source;
      let fileHasChanges = false;
      const fileResults: TransformResult[] = [];
      
      if (this.config.verbose) {
        console.log(chalk.gray(`Processing: ${filePath}`));
      }
      
      // Run each plugin on the file
      for (const plugin of pluginRegistry.getAll()) {
        try {
          const result = pluginRegistry.run(plugin.name, currentSource, filePath);
          fileResults.push(result);
          
          if (result.hasChanges) {
            currentSource = result.source;
            fileHasChanges = true;
            
            if (this.config.verbose) {
              console.log(chalk.green(`  ✓ ${plugin.name}: Applied changes`));
            }
          }
        } catch (error) {
          console.warn(chalk.yellow(`  ⚠ ${plugin.name}: ${error instanceof Error ? error.message : error}`));
        }
      }
      
      // Write changes if not in dry-run mode
      if (fileHasChanges) {
        if (this.config.write) {
          await this.ensureDirectoryExists(dirname(filePath));
          await fs.writeFile(filePath, currentSource, 'utf-8');
          console.log(chalk.green(`✓ Updated: ${filePath}`));
        } else {
          console.log(chalk.blue(`📋 Would update: ${filePath}`));
        }
        
        this.results.push({
          path: filePath,
          source: currentSource,
          hasChanges: fileHasChanges,
          changes: fileResults.flatMap(r => r.changes)
        });
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error processing ${filePath}:`), error instanceof Error ? error.message : error);
    }
  }
  
  private async postProcess(): Promise<void> {
    const changedFiles = this.results.filter(r => r.hasChanges).map(r => r.path);
    
    if (changedFiles.length === 0) {
      return;
    }
    
    if (this.config.format) {
      console.log(chalk.blue('\n🎨 Running Prettier...'));
      try {
        for (const file of changedFiles) {
          await execAsync(`npx prettier --write "${file}"`);
        }
        console.log(chalk.green('✓ Formatting complete'));
      } catch (error) {
        console.warn(chalk.yellow('⚠ Prettier failed:'), error instanceof Error ? error.message : error);
      }
    }
    
    if (this.config.lint || this.config.lintFix) {
      console.log(chalk.blue('\n🔍 Running ESLint...'));
      try {
        const fixFlag = this.config.lintFix ? '--fix' : '';
        for (const file of changedFiles) {
          await execAsync(`npx eslint ${fixFlag} "${file}"`);
        }
        console.log(chalk.green('✓ Linting complete'));
      } catch (error) {
        console.warn(chalk.yellow('⚠ ESLint failed:'), error instanceof Error ? error.message : error);
      }
    }
  }
  
  private async generateReport(): Promise<void> {
    console.log(chalk.blue('\n📊 Generating report...'));
    
    const reportPath = this.config.reportPath || 'meteor-upgrade-report.html';
    const changedFiles = this.results.filter(r => r.hasChanges);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meteor 2.x → 3.x Upgrade Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
        .header { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .file { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .file-path { font-weight: bold; color: #374151; }
        .changes { margin-top: 10px; }
        .change { margin: 5px 0; padding: 5px; background: #ecfdf5; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Meteor 2.x → 3.x Upgrade Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Files processed:</strong> ${this.results.length}</p>
        <p><strong>Files changed:</strong> ${changedFiles.length}</p>
        <p><strong>Total changes:</strong> ${changedFiles.reduce((sum, f) => sum + f.changes.length, 0)}</p>
        <p><strong>Mode:</strong> ${this.config.dry ? 'Dry run' : 'Write mode'}</p>
    </div>
    
    <div class="files">
        <h2>Changed Files</h2>
        ${changedFiles.map(file => `
            <div class="file">
                <div class="file-path">${file.path}</div>
                <div class="changes">
                    ${file.changes.map(change => `
                        <div class="change">
                            <strong>${change.type}:</strong> ${change.description}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    
    await fs.writeFile(reportPath, html, 'utf-8');
    console.log(chalk.green(`✓ Report generated: ${reportPath}`));
  }
  
  private async commitChanges(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      console.log(chalk.yellow('⚠ Not in a git repository, skipping commit'));
      return;
    }
    
    console.log(chalk.blue('\n📝 Committing changes...'));
    
    await this.git.add('.');
    await this.git.commit('feat: Apply Meteor 2.x → 3.x async transforms\n\nGenerated by meteor-upgrade-to-3 CLI');
    
    console.log(chalk.green('✓ Changes committed'));
  }
  
  private printSummary(): void {
    const changedFiles = this.results.filter(r => r.hasChanges);
    
    console.log(chalk.blue.bold('\n🎉 Upgrade Summary'));
    console.log(chalk.gray('================================'));
    console.log(`Files processed: ${this.results.length}`);
    console.log(`Files changed: ${changedFiles.length}`);
    console.log(`Mode: ${this.config.dry ? 'Dry run' : 'Write mode'}`);
    
    if (changedFiles.length > 0) {
      console.log('\nChanged files:');
      changedFiles.forEach(file => {
        console.log(chalk.green(`  ✓ ${file.path}`));
      });
    }
    
    if (this.config.dry && changedFiles.length > 0) {
      console.log(chalk.blue('\n💡 Run with --write to apply changes'));
    }
  }
  
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}