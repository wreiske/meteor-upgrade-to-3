import { MeteorUserAsyncPlugin } from '../../plugins/meteor-user-async';
import jscodeshift from 'jscodeshift';

describe('MeteorUserAsyncPlugin', () => {
  let plugin: MeteorUserAsyncPlugin;

  beforeEach(() => {
    plugin = new MeteorUserAsyncPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('meteor-user-async');
      expect(plugin.description).toContain('Meteor.user');
      expect(plugin.description).toContain('userAsync');
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

    describe('Meteor.user transformation', () => {
      it('should transform simple Meteor.user call', () => {
        const input = 'const user = Meteor.user();';
        const result = runTransform(input);
        
        expect(result).toContain('Meteor.userAsync');
        expect(result).toContain('await');
      });

      it('should transform Meteor.user in conditional', () => {
        const input = `
if (Meteor.user()) {
  console.log('User is logged in');
}`;
        const result = runTransform(input);
        
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should transform Meteor.user in assignment', () => {
        const input = 'const currentUser = Meteor.user();';
        const result = runTransform(input);
        
        expect(result).toContain('await Meteor.userAsync');
      });
    });

    describe('function async conversion', () => {
      it('should make containing function async', () => {
        const input = `
function getCurrentUser() {
  const user = Meteor.user();
  return user;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function getCurrentUser');
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should make arrow function async', () => {
        const input = `
const getCurrentUser = () => {
  const user = Meteor.user();
  return user;
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async ()');
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should make method async', () => {
        const input = `
const obj = {
  getCurrentUser() {
    const user = Meteor.user();
    return user;
  }
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async getCurrentUser');
        expect(result).toContain('await Meteor.userAsync');
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple Meteor.user calls in same function', () => {
        const input = `
function checkUser() {
  const user1 = Meteor.user();
  const user2 = Meteor.user();
  return user1 && user2;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function checkUser');
        expect(result).toContain('await Meteor.userAsync');
        // Should have multiple userAsync calls
        expect(((result as string)?.match(/userAsync/g) || []).length).toBeGreaterThanOrEqual(2);
      });

      it('should handle Meteor.user in nested functions', () => {
        const input = `
function outer() {
  function inner() {
    const user = Meteor.user();
    return user;
  }
  return inner();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function inner');
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should handle Meteor.user with property access', () => {
        const input = `
function getUserName() {
  const userName = Meteor.user().username;
  return userName;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function getUserName');
        expect(result).toContain('await Meteor.userAsync');
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no changes needed', () => {
        const input = 'const test = "hello world";';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify unrelated user calls', () => {
        const input = 'const result = someObject.user();';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify already async Meteor.userAsync', () => {
        const input = `
async function test() {
  const user = await Meteor.userAsync();
  return user;
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not transform Meteor.users collection calls', () => {
        const input = 'const users = Meteor.users.find().fetch();';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle Meteor.user in ternary operator', () => {
        const input = `
function test() {
  const result = Meteor.user() ? 'logged in' : 'logged out';
  return result;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should handle Meteor.user in logical expressions', () => {
        const input = `
function test() {
  const isValid = Meteor.user() && someCondition;
  return isValid;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should handle Meteor.user in try-catch', () => {
        const input = `
function test() {
  try {
    const user = Meteor.user();
    return user;
  } catch (error) {
    console.error(error);
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function test');
        expect(result).toContain('await Meteor.userAsync');
      });

      it('should handle Meteor.user in return statement', () => {
        const input = `
function getUser() {
  return Meteor.user();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function getUser');
        expect(result).toContain('return await Meteor.userAsync');
      });
    });
  });
});