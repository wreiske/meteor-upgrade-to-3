import { IndexAsyncPlugin } from '../../plugins/index-async';
import jscodeshift from 'jscodeshift';

describe('IndexAsyncPlugin', () => {
  let plugin: IndexAsyncPlugin;

  beforeEach(() => {
    plugin = new IndexAsyncPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('index-async');
      expect(plugin.description).toContain('createIndexAsync');
    });
  });

  describe('transform', () => {
    const runTransform = (source: string) => {
      return plugin.transform(
        { source, path: 'test.js' },
        { jscodeshift, j: jscodeshift, stats: () => {}, report: () => {} },
        {}
      );
    };

    describe('_ensureIndex transformation', () => {
      it('should transform simple _ensureIndex call', () => {
        const input = 'Directory._ensureIndex({ phoneNumber: 1 });';
        const result = runTransform(input);
        
        expect(result).toContain('createIndexAsync');
        expect(result).toContain('await');
        expect(result).not.toContain('_ensureIndex');
      });

      it('should transform _ensureIndex with index specification', () => {
        const input = 'Directory._ensureIndex({ phoneNumber: 1, type: 1 });';
        const result = runTransform(input);
        
        expect(result).toContain('await Directory.createIndexAsync({ phoneNumber: 1, type: 1 })');
      });

      it('should transform _ensureIndex with options', () => {
        const input = 'Directory._ensureIndex({ phoneNumber: 1 }, { unique: true });';
        const result = runTransform(input);
        
        expect(result).toContain('await Directory.createIndexAsync({ phoneNumber: 1 }, { unique: true })');
      });

      it('should transform _ensureIndex from issue example', () => {
        const input = `Directory._ensureIndex({
    phoneNumber: 1,
    type: 1,
});`;
        const result = runTransform(input);
        
        expect(result).toContain('createIndexAsync');
        expect(result).toContain('await');
        expect(result).toContain('phoneNumber: 1');
        expect(result).toContain('type: 1');
      });

      it('should transform Conferences _ensureIndex from issue example', () => {
        const input = `Conferences._ensureIndex({
    bridgeuniqueid: 1,
}, {
    unique: true
});`;
        const result = runTransform(input);
        
        expect(result).toContain('await Conferences.createIndexAsync');
        expect(result).toContain('bridgeuniqueid: 1');
        expect(result).toContain('unique: true');
      });

      it('should handle multiple _ensureIndex calls', () => {
        const input = `
Directory._ensureIndex({ phoneNumber: 1, type: 1 });
Directory._ensureIndex({ phoneNumber: 1 }, { unique: true });
Conferences._ensureIndex({ bridgeuniqueid: 1 }, { unique: true });`;
        const result = runTransform(input);
        
        expect(result).toContain('await Directory.createIndexAsync({ phoneNumber: 1, type: 1 })');
        expect(result).toContain('await Directory.createIndexAsync({ phoneNumber: 1 }, { unique: true })');
        expect(result).toContain('await Conferences.createIndexAsync({ bridgeuniqueid: 1 }, { unique: true })');
      });
    });

    describe('function async conversion', () => {
      it('should make containing function async', () => {
        const input = `
function setupIndexes() {
  Directory._ensureIndex({ phoneNumber: 1 });
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function setupIndexes()');
        expect(result).toContain('await Directory.createIndexAsync');
      });

      it('should make arrow function async', () => {
        const input = `
const setupIndexes = () => {
  Directory._ensureIndex({ phoneNumber: 1 });
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async () =>');
        expect(result).toContain('await Directory.createIndexAsync');
      });

      it('should make method async', () => {
        const input = `
class IndexManager {
  setupIndexes() {
    Directory._ensureIndex({ phoneNumber: 1 });
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async setupIndexes()');
        expect(result).toContain('await Directory.createIndexAsync');
      });

      it('should make object method async', () => {
        const input = `
const manager = {
  setupIndexes() {
    Directory._ensureIndex({ phoneNumber: 1 });
  }
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async setupIndexes()');
        expect(result).toContain('await Directory.createIndexAsync');
      });
    });

    describe('nested and complex scenarios', () => {
      it('should handle multiple index calls in same function', () => {
        const input = `
function setupAllIndexes() {
  Directory._ensureIndex({ phoneNumber: 1, type: 1 });
  Directory._ensureIndex({ phoneNumber: 1 }, { unique: true });
  Conferences._ensureIndex({ bridgeuniqueid: 1 }, { unique: true });
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function setupAllIndexes()');
        const awaitCount = ((result as string)?.match(/await/g) || []).length;
        expect(awaitCount).toBe(3);
      });

      it('should handle conditional index creation', () => {
        const input = `
function conditionalSetup(shouldCreateIndex) {
  if (shouldCreateIndex) {
    Directory._ensureIndex({ phoneNumber: 1 });
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function conditionalSetup');
        expect(result).toContain('await Directory.createIndexAsync');
      });

      it('should handle try-catch blocks', () => {
        const input = `
function setupWithErrorHandling() {
  try {
    Directory._ensureIndex({ phoneNumber: 1 });
  } catch (error) {
    console.error('Index creation failed');
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function setupWithErrorHandling');
        expect(result).toContain('await Directory.createIndexAsync');
      });

      it('should not modify already async functions unnecessarily', () => {
        const input = `
async function setupIndexes() {
  Directory._ensureIndex({ phoneNumber: 1 });
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function setupIndexes()');
        expect(result).not.toContain('async async');
        expect(result).toContain('await Directory.createIndexAsync');
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no changes needed', () => {
        const input = `
function normalFunction() {
  console.log('No index calls here');
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify unrelated _ensure methods', () => {
        const input = `
const obj = {
  _ensureConnection() {
    return true;
  }
};
obj._ensureConnection();`;
        const result = runTransform(input);
        
        // Should not transform since it's not _ensureIndex specifically
        expect(result).toBeUndefined();
      });

      it('should not modify already transformed calls', () => {
        const input = `
async function setupIndexes() {
  await Directory.createIndexAsync({ phoneNumber: 1 });
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle _ensureIndex with computed property access', () => {
        const input = `
const method = '_ensureIndex';
Directory[method]({ phoneNumber: 1 });`;
        const result = runTransform(input);
        
        // Should not transform computed property access
        expect(result).toBeUndefined();
      });

      it('should handle different collection types', () => {
        const input = `
Users._ensureIndex({ email: 1 }, { unique: true });
Posts._ensureIndex({ createdAt: -1 });
Comments._ensureIndex({ postId: 1, createdAt: -1 });`;
        const result = runTransform(input);
        
        expect(result).toContain('await Users.createIndexAsync({ email: 1 }, { unique: true })');
        expect(result).toContain('await Posts.createIndexAsync({ createdAt: -1 })');
        expect(result).toContain('await Comments.createIndexAsync({ postId: 1, createdAt: -1 })');
      });

      it('should handle complex index specifications', () => {
        const input = `
MyCollection._ensureIndex({
  "profile.name": 1,
  "settings.notifications": -1,
  createdAt: 1
}, {
  unique: false,
  sparse: true,
  background: true
});`;
        const result = runTransform(input);
        
        expect(result).toContain('await MyCollection.createIndexAsync');
        expect(result).toContain('"profile.name": 1');
        expect(result).toContain('unique: false');
        expect(result).toContain('sparse: true');
        expect(result).toContain('background: true');
      });
    });
  });
});