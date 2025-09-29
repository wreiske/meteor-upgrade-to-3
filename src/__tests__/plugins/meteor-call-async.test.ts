import { MeteorCallAsyncPlugin } from '../../plugins/meteor-call-async';
import jscodeshift from 'jscodeshift';

describe('MeteorCallAsyncPlugin', () => {
  let plugin: MeteorCallAsyncPlugin;

  beforeEach(() => {
    plugin = new MeteorCallAsyncPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('meteor-call-async');
      expect(plugin.description).toContain('Meteor.call');
      expect(plugin.description).toContain('callAsync');
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

    describe('Meteor.call transformation', () => {
      it('should transform simple Meteor.call', () => {
        const input = 'const result = Meteor.call("methodName");';
        const result = runTransform(input);
        
        expect(result).toContain('Meteor.callAsync');
        expect(result).toContain('await');
      });

      it('should transform Meteor.call with parameters', () => {
        const input = 'const result = Meteor.call("methodName", param1, param2);';
        const result = runTransform(input);
        
        expect(result).toContain('Meteor.callAsync');
        expect(result).toContain('await');
        expect(result).toContain('param1, param2');
      });

      it('should transform Meteor.call with callback', () => {
        const input = `
Meteor.call("methodName", param, function(error, result) {
  if (error) console.error(error);
  else console.log(result);
});`;
        const result = runTransform(input);
        
        expect(result).toContain('Meteor.callAsync');
        expect(result).toContain('await');
        // Callback should be removed or handled
      });
    });

    describe('function async conversion', () => {
      it('should make containing function async', () => {
        const input = `
function callMethod() {
  const result = Meteor.call("test");
  return result;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function callMethod');
        expect(result).toContain('await Meteor.callAsync');
      });

      it('should make arrow function async', () => {
        const input = `
const callMethod = () => {
  const result = Meteor.call("test");
  return result;
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async ()');
        expect(result).toContain('await Meteor.callAsync');
      });

      it('should make method async', () => {
        const input = `
const obj = {
  callMethod() {
    const result = Meteor.call("test");
    return result;
  }
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async callMethod');
        expect(result).toContain('await Meteor.callAsync');
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple Meteor.call in same function', () => {
        const input = `
function processData() {
  const result1 = Meteor.call("method1");
  const result2 = Meteor.call("method2", param);
  return { result1, result2 };
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function processData');
        expect(result).toContain('await Meteor.callAsync("method1")');
        expect(result).toContain('await Meteor.callAsync("method2", param)');
      });

      it('should handle nested Meteor.call', () => {
        const input = `
function outer() {
  function inner() {
    const result = Meteor.call("test");
    return result;
  }
  return inner();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function inner');
        expect(result).toContain('await Meteor.callAsync');
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no changes needed', () => {
        const input = 'const test = "hello world";';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify unrelated calls', () => {
        const input = 'const result = someObject.call("method");';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify already async Meteor.callAsync', () => {
        const input = `
async function test() {
  const result = await Meteor.callAsync("method");
  return result;
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle Meteor.call in conditional', () => {
        const input = `
function test(condition) {
  if (condition) {
    const result = Meteor.call("method");
    return result;
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Meteor.callAsync');
      });

      it('should handle Meteor.call in try-catch', () => {
        const input = `
function test() {
  try {
    const result = Meteor.call("method");
    return result;
  } catch (error) {
    console.error(error);
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Meteor.callAsync');
      });
    });
  });
});