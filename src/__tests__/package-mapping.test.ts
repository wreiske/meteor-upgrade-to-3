import { PackageMappingService, PackageMapping } from '../package-mapping';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
}));

import * as fs from 'fs';

const mockExistsSync = fs.existsSync as jest.MockedFunction<
  typeof fs.existsSync
>;
const mockReadFile = fs.promises.readFile as jest.MockedFunction<
  typeof fs.promises.readFile
>;

describe('PackageMappingService', () => {
  let service: PackageMappingService;
  let mockMapping: PackageMapping;

  beforeEach(() => {
    service = new PackageMappingService('/test/project');
    mockMapping = {
      version: '1.0.0',
      packages: {
        'alanning:roles': {
          status: 'replaced',
          suggest: ['meteor/roles'],
          notes: 'Built into Meteor 3 core',
          migrationComplexity: 'medium',
          automaticMigration: true,
          category: 'authentication',
        },
        'test:package': {
          status: 'legacy',
          suggest: [],
          versionBump: '2.1.0',
          notes: 'Requires version 2.1.0+ for compatibility',
          migrationComplexity: 'low',
          automaticMigration: false,
          category: 'other',
        },
        'meteor/accounts-password': {
          status: 'ok',
          suggest: [],
          notes: 'Works with Meteor 3',
          migrationComplexity: 'low',
          automaticMigration: true,
          category: 'authentication',
        },
      },
    };

    jest.clearAllMocks();
  });

  describe('loadMapping', () => {
    it('should load mapping from file successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));

      const result = await service.loadMapping();

      expect(result).toEqual(mockMapping);
      expect(service.isLoaded()).toBe(true);
    });

    it('should return null if file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await service.loadMapping();

      expect(result).toBeNull();
      expect(service.isLoaded()).toBe(false);
    });

    it('should handle JSON parsing errors', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue('invalid json');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await service.loadMapping();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getPackageInfo', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should return package info for existing package', () => {
      const info = service.getPackageInfo('alanning:roles');

      expect(info).toEqual(mockMapping.packages['alanning:roles']);
    });

    it('should return null for non-existent package', () => {
      const info = service.getPackageInfo('non-existent:package');

      expect(info).toBeNull();
    });

    it('should return null when mapping is not loaded', () => {
      const unloadedService = new PackageMappingService();
      const info = unloadedService.getPackageInfo('alanning:roles');

      expect(info).toBeNull();
    });
  });

  describe('getPackagesByStatus', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should return packages with specific status', () => {
      const replacedPackages = service.getPackagesByStatus('replaced');

      expect(replacedPackages).toHaveLength(1);
      expect(replacedPackages[0].name).toBe('alanning:roles');
      expect(replacedPackages[0].info.status).toBe('replaced');
    });

    it('should return empty array for non-existent status', () => {
      const deprecatedPackages = service.getPackagesByStatus('deprecated');

      expect(deprecatedPackages).toHaveLength(0);
    });

    it('should return empty array when mapping not loaded', () => {
      const unloadedService = new PackageMappingService();
      const packages = unloadedService.getPackagesByStatus('ok');

      expect(packages).toHaveLength(0);
    });
  });

  describe('getPackagesByCategory', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should return packages with specific category', () => {
      const authPackages = service.getPackagesByCategory('authentication');

      expect(authPackages).toHaveLength(2);
      expect(authPackages.map((p) => p.name)).toContain('alanning:roles');
      expect(authPackages.map((p) => p.name)).toContain(
        'meteor/accounts-password'
      );
    });

    it('should return empty array for non-existent category', () => {
      const routingPackages = service.getPackagesByCategory('routing');

      expect(routingPackages).toHaveLength(0);
    });
  });

  describe('getAutomaticallyMigratablePackages', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should return packages with automatic migration', () => {
      const autoMigratablePackages =
        service.getAutomaticallyMigratablePackages();

      expect(autoMigratablePackages).toHaveLength(2);
      expect(autoMigratablePackages.map((p) => p.name)).toContain(
        'alanning:roles'
      );
      expect(autoMigratablePackages.map((p) => p.name)).toContain(
        'meteor/accounts-password'
      );
    });
  });

  describe('getMigrationSuggestions', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should return suggestions for package', () => {
      const suggestions = service.getMigrationSuggestions('alanning:roles');

      expect(suggestions).toEqual(['meteor/roles']);
    });

    it('should return empty array for package with no suggestions', () => {
      const suggestions = service.getMigrationSuggestions(
        'meteor/accounts-password'
      );

      expect(suggestions).toEqual([]);
    });

    it('should return empty array for non-existent package', () => {
      const suggestions = service.getMigrationSuggestions(
        'non-existent:package'
      );

      expect(suggestions).toEqual([]);
    });
  });

  describe('generateMigrationReport', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should generate report for detected packages', () => {
      const detectedPackages = [
        'alanning:roles',
        'test:package',
        'meteor/accounts-password',
      ];
      const report = service.generateMigrationReport(detectedPackages);

      expect(report.totalPackages).toBe(3);
      expect(report.problemPackages).toBe(2); // alanning:roles and test:package
      expect(report.packageIssues).toHaveLength(2);
      expect(report.suggestions).toHaveLength(1); // only alanning:roles has suggestions
    });

    it('should handle empty package list', () => {
      const report = service.generateMigrationReport([]);

      expect(report.totalPackages).toBe(0);
      expect(report.problemPackages).toBe(0);
      expect(report.packageIssues).toHaveLength(0);
      expect(report.suggestions).toHaveLength(0);
    });

    it('should handle packages not in mapping', () => {
      const detectedPackages = ['unknown:package'];
      const report = service.generateMigrationReport(detectedPackages);

      expect(report.totalPackages).toBe(1);
      expect(report.problemPackages).toBe(0);
      expect(report.packageIssues).toHaveLength(0);
      expect(report.suggestions).toHaveLength(0);
    });
  });

  describe('getAllPackageNames', () => {
    beforeEach(async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(mockMapping));
      await service.loadMapping();
    });

    it('should return all package names', () => {
      const packageNames = service.getAllPackageNames();

      expect(packageNames).toEqual([
        'alanning:roles',
        'test:package',
        'meteor/accounts-password',
      ]);
    });

    it('should return empty array when mapping not loaded', () => {
      const unloadedService = new PackageMappingService();
      const packageNames = unloadedService.getAllPackageNames();

      expect(packageNames).toEqual([]);
    });
  });
});
