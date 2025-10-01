export interface MeteorUpgradeConfig {
  // Input/Output options
  input?: string[];
  exclude?: string[];
  
  // Transform options
  dry?: boolean;
  write?: boolean;
  
  // Format and lint options
  format?: boolean;
  lint?: boolean;
  lintFix?: boolean;
  
  // Git options
  commit?: boolean;
  branch?: string;
  initRepo?: boolean;
  
  // Reporting options
  report?: boolean;
  reportPath?: string;
  verbose?: boolean;
  
  // Package mapping options
  packageMapping?: boolean;
  packageMappingPath?: string;
  
  // Transform preferences
  preferAwait?: boolean; // true for await, false for .then/.catch
  allowTopLevelAwait?: boolean;
  
  // Plugin options
  plugins?: string[];
  pluginOptions?: Record<string, any>;
  
  // Codemod-specific options
  transforms?: {
    asyncApi?: boolean;
    cursors?: boolean;
    callbacks?: boolean;
    meteorCall?: boolean;
    meteorUser?: boolean;
    roles?: boolean;
    fastrender?: boolean;
    indexAsync?: boolean;
  };
}

export const defaultConfig: MeteorUpgradeConfig = {
  input: ['**/*.js', '**/*.ts'],
  exclude: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
  dry: false,
  write: false,
  format: false,
  lint: false,
  lintFix: false,
  commit: false,
  report: false,
  verbose: false,
  preferAwait: true,
  allowTopLevelAwait: false,
  packageMapping: true,
  transforms: {
    asyncApi: true,
    cursors: true,
    callbacks: true,
    meteorCall: true,
    meteorUser: true,
    roles: true,
    fastrender: true,
    indexAsync: true,
  },
};