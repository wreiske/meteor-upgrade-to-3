import { Command } from 'commander';
import chalk from 'chalk';
import { MeteorUpgrader } from './upgrader';
import { MeteorUpgradeConfig, defaultConfig } from './config';

const program = new Command();

program
  .name('meteor-upgrade-to-3')
  .description('Zero-DRAMA codemods to migrate Meteor 2.x → 3.x (Fibers → async/await)')
  .version('1.0.0');

program
  .option('--dry', 'Perform a dry run without writing changes', defaultConfig.dry)
  .option('--write', 'Write changes to files', defaultConfig.write)
  .option('--format', 'Run Prettier on transformed files', defaultConfig.format)
  .option('--lint', 'Run ESLint on transformed files', defaultConfig.lint)
  .option('--lint-fix', 'Run ESLint with --fix on transformed files', defaultConfig.lintFix)
  .option('--commit', 'Commit changes after transformation', defaultConfig.commit)
  .option('--branch <name>', 'Create and switch to a new branch before changes')
  .option('--init-repo', 'Initialize git repository if it doesn\'t exist', defaultConfig.initRepo)
  .option('--report', 'Generate HTML report of changes', defaultConfig.report)
  .option('--report-path <path>', 'Path for the report file', 'meteor-upgrade-report.html')
  .option('--verbose', 'Verbose output', defaultConfig.verbose)
  .option('--prefer-then', 'Use .then/.catch instead of await', !defaultConfig.preferAwait)
  .option('--allow-top-level-await', 'Allow top-level await transforms', defaultConfig.allowTopLevelAwait)
  .option('--exclude <patterns>', 'Comma-separated list of patterns to exclude', 
    (value) => value.split(',').map(p => p.trim()))
  .option('--no-async-api', 'Disable async API transforms')
  .option('--no-cursors', 'Disable cursor async transforms')
  .option('--no-callbacks', 'Disable callback to await transforms')
  .option('--no-meteor-call', 'Disable Meteor.call to callAsync transforms')
  .option('--no-meteor-user', 'Disable Meteor.user to userAsync transforms')
  .argument('[input...]', 'Input files or directories (default: **/*.js **/*.ts)')
  .action(async (input: string[], options: any) => {
    console.log(chalk.blue.bold('🚀 Meteor 2.x → 3.x Migration Tool'));
    console.log(chalk.gray('  Zero-DRAMA codemods with guardrails and reports\n'));
    
    try {
      const config: MeteorUpgradeConfig = {
        ...defaultConfig,
        input: input.length > 0 ? input : defaultConfig.input,
        exclude: options.exclude || defaultConfig.exclude,
        dry: options.dry,
        write: options.write,
        format: options.format,
        lint: options.lint,
        lintFix: options.lintFix,
        commit: options.commit,
        branch: options.branch,
        initRepo: options.initRepo,
        report: options.report,
        reportPath: options.reportPath,
        verbose: options.verbose,
        preferAwait: !options.preferThen,
        allowTopLevelAwait: options.allowTopLevelAwait,
        transforms: {
          asyncApi: options.asyncApi !== false,
          cursors: options.cursors !== false,
          callbacks: options.callbacks !== false,
          meteorCall: options.meteorCall !== false,
          meteorUser: options.meteorUser !== false,
        },
      };
      
      // Validation
      if (!config.dry && !config.write) {
        console.log(chalk.yellow('⚠️  Neither --dry nor --write specified. Defaulting to --dry mode.'));
        config.dry = true;
      }
      
      if (config.dry && config.write) {
        console.log(chalk.yellow('⚠️  Both --dry and --write specified. Using --write mode.'));
        config.dry = false;
      }
      
      const upgrader = new MeteorUpgrader(config);
      await upgrader.run();
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}

program.parse();