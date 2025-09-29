import { defaultConfig, MeteorUpgradeConfig } from '../config';

describe('Config', () => {
  describe('defaultConfig', () => {
    it('should have correct default values', () => {
      expect(defaultConfig.input).toEqual(['**/*.js', '**/*.ts']);
      expect(defaultConfig.exclude).toEqual(['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*']);
      expect(defaultConfig.dry).toBe(false);
      expect(defaultConfig.write).toBe(false);
      expect(defaultConfig.format).toBe(false);
      expect(defaultConfig.lint).toBe(false);
      expect(defaultConfig.lintFix).toBe(false);
      expect(defaultConfig.commit).toBe(false);
      expect(defaultConfig.report).toBe(false);
      expect(defaultConfig.verbose).toBe(false);
      expect(defaultConfig.preferAwait).toBe(true);
      expect(defaultConfig.allowTopLevelAwait).toBe(false);
    });

    it('should have all transforms enabled by default', () => {
      expect(defaultConfig.transforms?.asyncApi).toBe(true);
      expect(defaultConfig.transforms?.cursors).toBe(true);
      expect(defaultConfig.transforms?.callbacks).toBe(true);
      expect(defaultConfig.transforms?.meteorCall).toBe(true);
      expect(defaultConfig.transforms?.meteorUser).toBe(true);
    });
  });

  describe('MeteorUpgradeConfig interface', () => {
    it('should allow all properties to be optional', () => {
      const config: MeteorUpgradeConfig = {};
      expect(config).toBeDefined();
    });

    it('should allow partial configuration', () => {
      const config: MeteorUpgradeConfig = {
        dry: true,
        verbose: true,
        transforms: {
          asyncApi: false,
        },
      };
      expect(config.dry).toBe(true);
      expect(config.verbose).toBe(true);
      expect(config.transforms?.asyncApi).toBe(false);
    });
  });
});