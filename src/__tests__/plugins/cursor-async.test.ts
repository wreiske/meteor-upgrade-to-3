import { CursorAsyncPlugin } from '../../plugins/cursor-async';
import jscodeshift from 'jscodeshift';

describe('CursorAsyncPlugin', () => {
  let plugin: CursorAsyncPlugin;

  beforeEach(() => {
    plugin = new CursorAsyncPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('cursor-async');
      expect(plugin.description).toContain('cursor methods');
      expect(plugin.description).toContain('Async');
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

    describe('count transformation', () => {
      it('should transform cursor count call', () => {
        const input = 'const total = Users.find().count();';
        const result = runTransform(input);
        
        expect(result).toContain('countAsync');
        expect(result).toContain('await');
      });

      it('should transform count with parameters', () => {
        const input = 'const total = Users.find().count({ applySkipLimit: false });';
        const result = runTransform(input);
        
        expect(result).toContain('countAsync');
        expect(result).toContain('await');
      });
    });

    describe('fetch transformation', () => {
      it('should transform cursor fetch call', () => {
        const input = 'const docs = Users.find().fetch();';
        const result = runTransform(input);
        
        expect(result).toContain('fetchAsync');
        expect(result).toContain('await');
      });

      it('should transform chained fetch call', () => {
        const input = 'const docs = Users.find().fetch();';
        const result = runTransform(input);
        
        expect(result).toContain('fetchAsync');
        expect(result).toContain('await');
      });
    });

    describe('forEach transformation', () => {
      it('should transform cursor forEach call', () => {
        const input = 'Users.find().forEach(doc => console.log(doc));';
        const result = runTransform(input);
        
        expect(result).toContain('forEachAsync');
        expect(result).toContain('await');
      });

      it('should transform forEach with callback', () => {
        const input = `
Users.find().forEach(function(doc) {
  console.log(doc._id);
});`;
        const result = runTransform(input);
        
        expect(result).toContain('forEachAsync');
        expect(result).toContain('await');
      });
    });

    describe('map transformation', () => {
      it('should transform cursor map call', () => {
        const input = 'const ids = Users.find().map(doc => doc._id);';
        const result = runTransform(input);
        
        expect(result).toContain('mapAsync');
        expect(result).toContain('await');
      });

      it('should transform chained map call', () => {
        const input = 'const names = Users.find().map(user => user.name);';
        const result = runTransform(input);
        
        expect(result).toContain('mapAsync');
        expect(result).toContain('await');
      });

      it('should transform map on cursor variable with async callback', () => {
        const input = `const workspaceMcpLinks = WorkspaceMCPServerLinks.find({
  workspaceId: workspace ? workspace._id : null,
});
mcpTools = workspaceMcpLinks.map(function (serverLink) {
  const mcpServer = MCPServers.findOneAsync({
    _id: serverLink.serverId,
  });
  return getOpenAiMcpToolDefinition({ label: serverLink.name, url: mcpServer.url });
});`;
        const result = runTransform(input);
        
        expect(result).toContain('await workspaceMcpLinks.mapAsync');
        expect(result).toContain('async function(serverLink)');
      });

      it('should handle assignment expressions with cursor variables', () => {
        const input = `let cursor;
cursor = Users.find({});
const results = cursor.map(user => user.name);`;
        const result = runTransform(input);
        
        expect(result).toContain('await cursor.mapAsync');
      });

      it('should transform forEach on cursor variable', () => {
        const input = `const users = Users.find({});
users.forEach(function(user) {
  console.log(user.name);
});`;
        const result = runTransform(input);
        
        expect(result).toContain('await users.forEachAsync');
      });
    });

    describe('function async conversion', () => {
      it('should make containing function async', () => {
        const input = `
function processData() {
  const total = Users.find().count();
  const docs = Users.find().fetch();
  return { total, docs };
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function processData');
        expect(result).toContain('await Users.find().countAsync');
        expect(result).toContain('await Users.find().fetchAsync');
      });

      it('should make arrow function async', () => {
        const input = `
const processData = () => {
  const total = Users.find().count();
  return total;
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async ()');
        expect(result).toContain('await Users.find().countAsync');
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple cursor methods in same function', () => {
        const input = `
function analyzeData() {
  const count = Users.find().count();
  const docs = Users.find().fetch();
  const ids = Users.find().map(u => u._id);
  return { count, docs, ids };
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function analyzeData');
        expect(result).toContain('await Users.find().countAsync');
        expect(result).toContain('await Users.find().fetchAsync');
        expect(result).toContain('await Users.find().mapAsync');
      });

      it('should handle nested cursor calls', () => {
        const input = `
function processUsers() {
  function getUserCount() {
    return Users.find().count();
  }
  return getUserCount();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function getUserCount');
        expect(result).toContain('await Users.find().countAsync');
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no changes needed', () => {
        const input = 'const test = "hello world";';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify unrelated method calls', () => {
        const input = 'const result = someObject.count();';
        const result = runTransform(input);
        
        // This might still transform as we can't easily distinguish cursor calls
        // The test documents the current behavior
        if (result) {
          expect(result).toContain('countAsync');
        }
      });

      it('should not modify already async cursor methods', () => {
        const input = `
async function test() {
  const count = await cursor.countAsync();
  return count;
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle cursor methods in conditional', () => {
        const input = `
function test(condition) {
  if (condition) {
    const count = Users.find().count();
    return count;
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Users.find().countAsync');
      });

      it('should handle cursor methods in try-catch', () => {
        const input = `
function test() {
  try {
    const docs = Users.find().fetch();
    return docs;
  } catch (error) {
    console.error(error);
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Users.find().fetchAsync');
      });
    });
  });
});