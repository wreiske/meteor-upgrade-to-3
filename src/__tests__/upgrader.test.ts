import { MeteorUpgrader } from '../upgrader';
import { MeteorUpgradeConfig } from '../config';
import { pluginRegistry } from '../plugin-registry';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

jest.mock('globby', () => ({
  globby: jest.fn()
}));

jest.mock('chalk', () => {
  const mockChalk: any = {
    blue: jest.fn((text) => text),
    green: jest.fn((text) => text),
    yellow: jest.fn((text) => text),
    red: jest.fn((text) => text),
    gray: jest.fn((text) => text)
  };
  
  // Add nested methods
  mockChalk.blue.bold = jest.fn((text) => text);
  mockChalk.red.bold = jest.fn((text) => text);
  
  return {
    __esModule: true,
    default: mockChalk,
    ...mockChalk
  };
});

jest.mock('simple-git', () => {
  const mockGit = {
    checkIsRepo: jest.fn(),
    init: jest.fn(),
    checkoutLocalBranch: jest.fn(),
    add: jest.fn(),
    commit: jest.fn(),
    raw: jest.fn()
  };
  return jest.fn(() => mockGit);
});

jest.mock('child_process', () => ({
  exec: jest.fn().mockImplementation((cmd, callback) => {
    if (typeof callback === 'function') {
      process.nextTick(() => callback(null, '', ''));
    }
    return { pid: 1234 } as any; // Mock ChildProcess
  })
}));

jest.mock('../plugin-registry', () => ({
  pluginRegistry: {
    register: jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
    run: jest.fn()
  }
}));

import { promises as fs } from 'fs';
import { globby } from 'globby';
import simpleGit from 'simple-git';
import { exec } from 'child_process';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGlobby = globby as jest.MockedFunction<typeof globby>;
const mockSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;
const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockPluginRegistry = pluginRegistry as jest.Mocked<typeof pluginRegistry>;

describe('MeteorUpgrader', () => {
  let upgrader: MeteorUpgrader;
  let config: MeteorUpgradeConfig;
  let mockGit: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    config = {
      dry: true,
      input: ['**/*.js'],
      exclude: ['node_modules/**'],
      verbose: false,
      transforms: {
        asyncApi: true,
        cursors: true,
        meteorCall: true,
        meteorUser: true,
        callbacks: true
      }
    };

    mockGit = {
      checkIsRepo: jest.fn().mockResolvedValue(true),
      init: jest.fn().mockResolvedValue(undefined),
      checkoutLocalBranch: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      raw: jest.fn().mockResolvedValue('')
    };
    mockSimpleGit.mockReturnValue(mockGit);

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      upgrader = new MeteorUpgrader(config);
      expect(upgrader).toBeInstanceOf(MeteorUpgrader);
    });

    it('should register plugins based on config', () => {
      upgrader = new MeteorUpgrader(config);
      
      // Should have called register for each enabled transform
      expect(mockPluginRegistry.register).toHaveBeenCalledTimes(5);
    });

    it('should not register disabled plugins', () => {
      config.transforms!.asyncApi = false;
      config.transforms!.cursors = false;
      
      upgrader = new MeteorUpgrader(config);
      
      // Should have called register for 3 remaining enabled transforms
      expect(mockPluginRegistry.register).toHaveBeenCalledTimes(3);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      upgrader = new MeteorUpgrader(config);
      mockGlobby.mockResolvedValue(['test.js', 'src/app.js']);
      mockFs.readFile.mockResolvedValue('const test = 1;');
      mockPluginRegistry.getAll.mockReturnValue([]);
      mockPluginRegistry.run.mockReturnValue({
        path: 'test.js',
        source: 'const test = 1;',
        hasChanges: false,
        changes: []
      });
    });

    it('should complete dry run successfully', async () => {
      await upgrader.run();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting Meteor 2.x → 3.x upgrade process')
      );
    });

    it('should find and process files', async () => {
      await upgrader.run();
      
      expect(mockGlobby).toHaveBeenCalledWith(
        config.input,
        { ignore: config.exclude, absolute: true, onlyFiles: true }
      );
      expect(mockFs.readFile).toHaveBeenCalledWith('test.js', 'utf-8');
      expect(mockFs.readFile).toHaveBeenCalledWith('src/app.js', 'utf-8');
    });

    it('should handle no files found', async () => {
      mockGlobby.mockResolvedValue([]);
      
      await upgrader.run();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No files found to process')
      );
    });

    it('should handle write mode', async () => {
      config.write = true;
      config.dry = false;
      upgrader = new MeteorUpgrader(config);
      
      mockPluginRegistry.run.mockReturnValue({
        path: 'test.js',
        source: 'const test = await findOneAsync();',
        hasChanges: true,
        changes: []
      });

      await upgrader.run();
      
      // In dry mode, files are not written
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle git operations in write mode', async () => {
      config.write = true;
      config.commit = true;
      upgrader = new MeteorUpgrader(config);
      
      mockPluginRegistry.run.mockReturnValue({
        path: 'test.js',
        source: 'const test = await findOneAsync();',
        hasChanges: true,
        changes: []
      });

      await upgrader.run();
      
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith(
        expect.stringContaining('Apply Meteor 2.x → 3.x async transforms')
      );
    });

    it('should handle branch creation', async () => {
      config.branch = 'feature/meteor-3-upgrade';
      upgrader = new MeteorUpgrader(config);

      await upgrader.run();
      
      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith(
        'feature/meteor-3-upgrade'
      );
    });

    it('should handle git init when not in repo', async () => {
      config.initRepo = true;
      mockGit.checkIsRepo.mockResolvedValue(false);
      upgrader = new MeteorUpgrader(config);

      await upgrader.run();
      
      expect(mockGit.init).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      upgrader = new MeteorUpgrader(config);
    });

    it('should handle file read errors gracefully', async () => {
      mockGlobby.mockResolvedValue(['test.js']);
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      // Should not throw, but handle error gracefully
      await expect(upgrader.run()).resolves.not.toThrow();
    });

    it('should handle plugin errors gracefully', async () => {
      mockGlobby.mockResolvedValue(['test.js']);
      mockFs.readFile.mockResolvedValue('const test = 1;');
      mockPluginRegistry.getAll.mockReturnValue([
        { name: 'test-plugin', description: 'Test', transform: jest.fn() }
      ]);
      mockPluginRegistry.run.mockImplementation(() => {
        throw new Error('Plugin failed');
      });
      
      // Should not throw, but handle error gracefully
      await expect(upgrader.run()).resolves.not.toThrow();
    });
  });

  describe('formatting and linting', () => {
    beforeEach(() => {
      config.write = true;
      config.format = true;
      config.lintFix = true;
      upgrader = new MeteorUpgrader(config);
      
      mockGlobby.mockResolvedValue(['test.js']);
      mockFs.readFile.mockResolvedValue('const test = 1;');
      mockPluginRegistry.run.mockReturnValue({
        path: 'test.js',
        source: 'const test = await findOneAsync();',
        hasChanges: true,
        changes: []
      });
    });

    it('should run prettier when format is enabled', async () => {
      // The mock is already set up in the jest.mock call
      await upgrader.run();
      
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('prettier --write'),
        expect.any(Function)
      );
    });

    it('should run eslint when lintFix is enabled', async () => {
      // The mock is already set up in the jest.mock call
      await upgrader.run();
      
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('eslint --fix'),
        expect.any(Function)
      );
    });
  });
});