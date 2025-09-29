import { DefaultPluginRegistry } from '../plugin-registry';
import { Plugin, BasePlugin } from '../types';
import { Transform } from 'jscodeshift';

// Mock plugin for testing
class MockPlugin extends BasePlugin {
  name = 'mock-plugin';
  description = 'Mock plugin for testing';
  
  transform: Transform = (fileInfo, api, _options) => {
    if (fileInfo.source.includes('mock-change')) {
      return fileInfo.source.replace('mock-change', 'mock-changed');
    }
    return undefined;
  };
}

class FailingPlugin extends BasePlugin {
  name = 'failing-plugin';
  description = 'Plugin that always fails';
  
  transform: Transform = () => {
    throw new Error('Plugin intentionally failed');
  };
}

describe('DefaultPluginRegistry', () => {
  let registry: DefaultPluginRegistry;
  
  beforeEach(() => {
    registry = new DefaultPluginRegistry();
  });

  describe('register', () => {
    it('should register a plugin', () => {
      const plugin = new MockPlugin();
      registry.register(plugin);
      
      expect(registry.get('mock-plugin')).toBe(plugin);
    });

    it('should allow overriding a plugin with same name', () => {
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      
      registry.register(plugin1);
      registry.register(plugin2);
      
      expect(registry.get('mock-plugin')).toBe(plugin2);
    });
  });

  describe('get', () => {
    it('should return registered plugin', () => {
      const plugin = new MockPlugin();
      registry.register(plugin);
      
      expect(registry.get('mock-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no plugins registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered plugins', () => {
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      plugin2.name = 'mock-plugin-2';
      
      registry.register(plugin1);
      registry.register(plugin2);
      
      const plugins = registry.getAll();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      registry.register(new MockPlugin());
    });

    it('should run plugin and return result with changes', () => {
      const source = 'const test = "mock-change";';
      const result = registry.run('mock-plugin', source, 'test.js');
      
      expect(result.path).toBe('test.js');
      expect(result.source).toBe('const test = "mock-changed";');
      expect(result.hasChanges).toBe(true);
      expect(result.changes).toEqual([]);
    });

    it('should run plugin and return result without changes', () => {
      const source = 'const test = "no-change";';
      const result = registry.run('mock-plugin', source, 'test.js');
      
      expect(result.path).toBe('test.js');
      expect(result.source).toBe(source);
      expect(result.hasChanges).toBe(false);
      expect(result.changes).toEqual([]);
    });

    it('should throw error for non-existent plugin', () => {
      expect(() => {
        registry.run('non-existent', 'code', 'test.js');
      }).toThrow('Plugin non-existent not found');
    });

    it('should wrap plugin errors with context', () => {
      registry.register(new FailingPlugin());
      
      expect(() => {
        registry.run('failing-plugin', 'code', 'test.js');
      }).toThrow('Plugin failing-plugin failed: Plugin intentionally failed');
    });
  });
});