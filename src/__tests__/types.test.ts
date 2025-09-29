import { BasePlugin, TransformResult, Change, Plugin } from '../types';
import { Transform } from 'jscodeshift';

describe('Types', () => {
  describe('TransformResult interface', () => {
    it('should have correct structure', () => {
      const result: TransformResult = {
        path: 'test.js',
        source: 'const test = 1;',
        hasChanges: true,
        changes: [],
      };

      expect(result.path).toBe('test.js');
      expect(result.source).toBe('const test = 1;');
      expect(result.hasChanges).toBe(true);
      expect(result.changes).toEqual([]);
    });
  });

  describe('Change interface', () => {
    it('should support add change type', () => {
      const change: Change = {
        type: 'add',
        description: 'Added async keyword',
        line: 5,
        column: 10,
        newCode: 'async function',
      };

      expect(change.type).toBe('add');
      expect(change.description).toBe('Added async keyword');
      expect(change.line).toBe(5);
      expect(change.column).toBe(10);
      expect(change.newCode).toBe('async function');
    });

    it('should support modify change type', () => {
      const change: Change = {
        type: 'modify',
        description: 'Changed to async method',
        line: 3,
        oldCode: 'findOne()',
        newCode: 'await findOneAsync()',
      };

      expect(change.type).toBe('modify');
      expect(change.oldCode).toBe('findOne()');
      expect(change.newCode).toBe('await findOneAsync()');
    });

    it('should support remove change type', () => {
      const change: Change = {
        type: 'remove',
        description: 'Removed callback parameter',
        oldCode: 'function(err, result) {}',
      };

      expect(change.type).toBe('remove');
      expect(change.oldCode).toBe('function(err, result) {}');
    });
  });

  describe('BasePlugin abstract class', () => {
    class TestPlugin extends BasePlugin {
      name = 'test-plugin';
      description = 'Test plugin';

      transform: Transform = (fileInfo) => {
        return fileInfo.source;
      };
    }

    it('should accept options in constructor', () => {
      const options = { test: true };
      const plugin = new TestPlugin(options);

      expect(plugin.options).toEqual(options);
    });

    it('should work without options', () => {
      const plugin = new TestPlugin();

      expect(plugin.options).toBeUndefined();
    });

    it('should implement Plugin interface', () => {
      const plugin = new TestPlugin();

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.description).toBe('Test plugin');
      expect(typeof plugin.transform).toBe('function');
    });
  });

  describe('Plugin interface', () => {
    it('should define required properties', () => {
      const plugin: Plugin = {
        name: 'test',
        description: 'Test plugin',
        transform: (fileInfo) => fileInfo.source,
      };

      expect(plugin.name).toBe('test');
      expect(plugin.description).toBe('Test plugin');
      expect(typeof plugin.transform).toBe('function');
    });

    it('should allow optional options property', () => {
      const plugin: Plugin = {
        name: 'test',
        description: 'Test plugin',
        transform: (fileInfo) => fileInfo.source,
        options: { verbose: true },
      };

      expect(plugin.options).toEqual({ verbose: true });
    });
  });
});
