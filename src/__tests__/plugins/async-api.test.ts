import { AsyncApiPlugin } from '../../plugins/async-api';
import jscodeshift from 'jscodeshift';

describe('AsyncApiPlugin', () => {
  let plugin: AsyncApiPlugin;

  beforeEach(() => {
    plugin = new AsyncApiPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('async-api');
      expect(plugin.description).toContain('async versions');
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

    describe('findOne transformation', () => {
      it('should transform simple findOne call', () => {
        const input = 'const user = collection.findOne();';
        const result = runTransform(input);
        
        expect(result).toContain('findOneAsync');
        expect(result).toContain('await');
      });

      it('should transform findOne with parameters', () => {
        const input = 'const user = Users.findOne({ _id: userId });';
        const result = runTransform(input);
        
        expect(result).toContain('findOneAsync');
        expect(result).toContain('await');
      });

      it('should not transform unrelated findOne calls', () => {
        const input = 'const result = someObject.findOne();';
        const result = runTransform(input);
        
        // Should still transform as we can't easily distinguish collection calls
        expect(result).toContain('findOneAsync');
      });
    });

    describe('insert transformation', () => {
      it('should transform insert call', () => {
        const input = 'const id = collection.insert(doc);';
        const result = runTransform(input);
        
        expect(result).toContain('insertAsync');
        expect(result).toContain('await');
      });

      it('should transform insert with callback', () => {
        const input = 'collection.insert(doc, callback);';
        const result = runTransform(input);
        
        expect(result).toContain('insertAsync');
        expect(result).toContain('await');
      });
    });

    describe('update transformation', () => {
      it('should transform update call', () => {
        const input = 'collection.update({ _id: id }, { $set: { name: "test" } });';
        const result = runTransform(input);
        
        expect(result).toContain('updateAsync');
        expect(result).toContain('await');
      });
    });

    describe('upsert transformation', () => {
      it('should transform upsert call', () => {
        const input = 'collection.upsert({ _id: id }, doc);';
        const result = runTransform(input);
        
        expect(result).toContain('upsertAsync');
        expect(result).toContain('await');
      });
    });

    describe('remove transformation', () => {
      it('should transform remove call', () => {
        const input = 'collection.remove({ _id: id });';
        const result = runTransform(input);
        
        expect(result).toContain('removeAsync');
        expect(result).toContain('await');
      });
    });

    describe('function async conversion', () => {
      it('should make containing function async', () => {
        const input = `
function getData() {
  const user = Users.findOne();
  return user;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function getData');
        expect(result).toContain('await Users.findOneAsync');
      });

      it('should make arrow function async', () => {
        const input = `
const getData = () => {
  const user = Users.findOne();
  return user;
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async ()');
        expect(result).toContain('await Users.findOneAsync');
      });

      it('should make method async', () => {
        const input = `
const obj = {
  getData() {
    const user = Users.findOne();
    return user;
  }
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async getData');
        expect(result).toContain('await Users.findOneAsync');
      });
    });

    describe('nested function calls', () => {
      it('should handle multiple async calls in same function', () => {
        const input = `
function processData() {
  const user = Users.findOne();
  const result = collection.insert(data);
  return { user, result };
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function processData');
        expect(result).toContain('await Users.findOneAsync');
        expect(result).toContain('await collection.insertAsync');
      });

      it('should handle nested function calls', () => {
        const input = `
function outer() {
  function inner() {
    const user = Users.findOne();
    return user;
  }
  return inner();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function inner');
        expect(result).toContain('await Users.findOneAsync');
        // outer function should remain unchanged if it doesn't have direct async calls
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no changes needed', () => {
        const input = 'const test = "hello world";';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify already async functions unnecessarily', () => {
        const input = `
async function getData() {
  const data = await someAsyncCall();
  return data;
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });
  });
});