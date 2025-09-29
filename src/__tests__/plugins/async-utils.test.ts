import { isAlreadyAwaited, findContainingFunction, addAwaitAndMakeAsync, makeFunctionAsync } from '../../plugins/async-utils';
import jscodeshift from 'jscodeshift';

describe('async-utils', () => {
  const j = jscodeshift;

  describe('isAlreadyAwaited', () => {
    it('should return true for already awaited expressions', () => {
      const source = 'await someFunction()';
      const ast = j(source);
      
      ast.find(j.CallExpression).forEach(path => {
        expect(isAlreadyAwaited(path)).toBe(true);
      });
    });

    it('should return false for non-awaited expressions', () => {
      const source = 'someFunction()';
      const ast = j(source);
      
      ast.find(j.CallExpression).forEach(path => {
        expect(isAlreadyAwaited(path)).toBe(false);
      });
    });
  });

  describe('findContainingFunction', () => {
    it('should find containing function declaration', () => {
      const source = `
function testFunction() {
  someFunction();
}`;
      const ast = j(source);
      
      ast.find(j.CallExpression).forEach(path => {
        const containingFunction = findContainingFunction(path);
        expect(containingFunction).toBeDefined();
        expect(containingFunction.value.type).toBe('FunctionDeclaration');
        expect(containingFunction.value.id.name).toBe('testFunction');
      });
    });

    it('should find containing arrow function', () => {
      const source = `
const testFunction = () => {
  someFunction();
};`;
      const ast = j(source);
      
      ast.find(j.CallExpression).forEach(path => {
        const containingFunction = findContainingFunction(path);
        expect(containingFunction).toBeDefined();
        expect(containingFunction.value.type).toBe('ArrowFunctionExpression');
      });
    });

    it('should find containing method', () => {
      const source = `
const obj = {
  testMethod() {
    someFunction();
  }
};`;
      const ast = j(source);
      
      ast.find(j.CallExpression).forEach(path => {
        const containingFunction = findContainingFunction(path);
        expect(containingFunction).toBeDefined();
        // Should find the FunctionExpression node containing the method
        expect(containingFunction.value.type).toBe('FunctionExpression');
      });
    });

    it('should return null for top-level expressions', () => {
      const source = 'someFunction();';
      const ast = j(source);
      
      ast.find(j.CallExpression).forEach(path => {
        const containingFunction = findContainingFunction(path);
        expect(containingFunction).toBeNull();
      });
    });
  });

  describe('addAwaitAndMakeAsync', () => {
    it('should add await to call expression and mark function for async conversion', () => {
      const source = `
function testFunction() {
  const result = someFunction();
  return result;
}`;
      const ast = j(source);
      const functionsToMakeAsync = new Set();
      
      ast.find(j.CallExpression).forEach(path => {
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
      });
      
      const result = ast.toSource();
      expect(result).toContain('await someFunction()');
      expect(functionsToMakeAsync.size).toBe(1);
    });

    it('should not add await if already awaited', () => {
      const source = `
async function testFunction() {
  const result = await someFunction();
  return result;
}`;
      const ast = j(source);
      const functionsToMakeAsync = new Set();
      
      ast.find(j.CallExpression).forEach(path => {
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
      });
      
      const result = ast.toSource();
      // Should not have double await
      expect(result).not.toContain('await await');
      expect(result).toContain('await someFunction()');
      expect(functionsToMakeAsync.size).toBe(0);
    });

    it('should handle top-level expressions without function container', () => {
      const source = 'someFunction();';
      const ast = j(source);
      const functionsToMakeAsync = new Set();
      
      ast.find(j.CallExpression).forEach(path => {
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
      });
      
      const result = ast.toSource();
      expect(result).toContain('await someFunction()');
      expect(functionsToMakeAsync.size).toBe(0);
    });
  });

  describe('makeFunctionAsync', () => {
    it('should make function declaration async', () => {
      const source = `
function testFunction() {
  return someValue;
}`;
      const ast = j(source);
      
      ast.find(j.FunctionDeclaration).forEach(path => {
        makeFunctionAsync(j, path);
      });
      
      const result = ast.toSource();
      expect(result).toContain('async function testFunction()');
    });

    it('should make arrow function async', () => {
      const source = `
const testFunction = () => {
  return someValue;
};`;
      const ast = j(source);
      
      ast.find(j.ArrowFunctionExpression).forEach(path => {
        makeFunctionAsync(j, path);
      });
      
      const result = ast.toSource();
      expect(result).toContain('async ()');
    });

    it('should make method async', () => {
      const source = `
const obj = {
  testMethod() {
    return someValue;
  }
};`;
      const ast = j(source);
      
      ast.find(j.Property).forEach(path => {
        if (path.value.value && path.value.value.type === 'FunctionExpression') {
          makeFunctionAsync(j, path);
        }
      });
      
      const result = ast.toSource();
      expect(result).toContain('async testMethod()');
    });

    it('should not modify already async functions', () => {
      const source = `
async function testFunction() {
  return someValue;
}`;
      const ast = j(source);
      
      ast.find(j.FunctionDeclaration).forEach(path => {
        makeFunctionAsync(j, path);
      });
      
      const result = ast.toSource();
      expect(result).toContain('async function testFunction()');
      // Should not have double async
      expect(result).not.toContain('async async');
    });
  });

  describe('integration tests', () => {
    it('should work together to transform a complete function', () => {
      const source = `
function processData() {
  const user = Users.findOne();
  const result = collection.insert(data);
  return { user, result };
}`;
      const ast = j(source);
      const functionsToMakeAsync = new Set();
      
      // Find and transform method calls
      ast.find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          property: { name: 'findOne' }
        }
      }).forEach(path => {
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
      });
      
      ast.find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          property: { name: 'insert' }
        }
      }).forEach(path => {
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
      });
      
      // Make functions async
      functionsToMakeAsync.forEach(functionPath => {
        makeFunctionAsync(j, functionPath);
      });
      
      const result = ast.toSource();
      expect(result).toContain('async function processData');
      expect(result).toContain('await Users.findOne()');
      expect(result).toContain('await collection.insert(data)');
    });
  });
});