import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms cursor methods to their async counterparts and adds proper async/await:
 * - cursor.count() -> await cursor.countAsync()
 * - cursor.fetch() -> await cursor.fetchAsync()
 * - cursor.forEach() -> await cursor.forEachAsync()
 * - cursor.map() -> await cursor.mapAsync()
 * Also makes containing functions async when needed.
 */
export class CursorAsyncPlugin extends BasePlugin {
  name = 'cursor-async';
  description =
    'Transform cursor methods to async versions (count -> countAsync, etc.) and add async/await';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Method mappings
    const methodMappings = {
      count: 'countAsync',
      fetch: 'fetchAsync',
      forEach: 'forEachAsync',
      map: 'mapAsync',
    };

    // Track functions that need to be made async
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionsToMakeAsync = new Set<any>();

    // Track cursor variables (variables assigned from .find() calls)
    const cursorVariables = new Set<string>();

    // First pass: Find variables assigned from .find() calls
    root.find(j.VariableDeclarator).forEach((path) => {
      const { node } = path;
      if (
        node.init &&
        node.init.type === 'CallExpression' &&
        node.init.callee
      ) {
        const initSource = j(node.init).toSource();
        if (initSource.includes('.find(')) {
          if (node.id && node.id.type === 'Identifier') {
            cursorVariables.add(node.id.name);
          }
        }
      }
    });

    // Also look for assignment expressions
    root.find(j.AssignmentExpression).forEach((path) => {
      const { node } = path;
      if (node.right && node.right.type === 'CallExpression') {
        const rightSource = j(node.right).toSource();
        if (rightSource.includes('.find(')) {
          if (node.left && node.left.type === 'Identifier') {
            cursorVariables.add(node.left.name);
          }
        }
      }
    });

    // Second pass: Find and transform cursor method calls
    Object.entries(methodMappings).forEach(([oldMethod, newMethod]) => {
      root
        .find(j.CallExpression, {
          callee: {
            type: 'MemberExpression',
            property: { name: oldMethod },
          },
        })
        .forEach((path) => {
          const { node } = path;
          const memberExpr = node.callee as {
            object: unknown;
            property: { name: string };
          };

          let shouldTransform = false;
          const objSource = j(memberExpr.object as never).toSource();

          // Check if it's a direct cursor call
          if (objSource.includes('.find(') || objSource.includes('.findOne(')) {
            shouldTransform = true;
          }
          // Check if it's a cursor variable
          else if (
            memberExpr.object &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (memberExpr.object as any).type === 'Identifier'
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const varName = (memberExpr.object as any as { name: string }).name;
            if (cursorVariables.has(varName)) {
              shouldTransform = true;
            }
          }

          if (shouldTransform) {
            memberExpr.property.name = newMethod;
            hasChanges = true;

            // Add await and make containing function async if needed
            addAwaitAndMakeAsync(j, path, functionsToMakeAsync);

            // For map and forEach, check if the callback contains async operations
            if (oldMethod === 'map' || oldMethod === 'forEach') {
              this.handleAsyncCallback(j, node);
            }
          }
        });
    });

    // Make marked functions async
    functionsToMakeAsync.forEach((functionPath) => {
      makeFunctionAsync(j, functionPath);
    });

    return hasChanges ? root.toSource() : undefined;
  };

  // Helper method to handle async callbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleAsyncCallback(j: any, callNode: any): void {
    if (callNode.arguments && callNode.arguments.length > 0) {
      const callback = callNode.arguments[0];

      // Check if callback is a function and contains async operations
      if (
        callback.type === 'FunctionExpression' ||
        callback.type === 'ArrowFunctionExpression'
      ) {
        // Look for async operations in the callback body
        const callbackSource = j(callback).toSource();

        // Check for patterns that indicate async operations
        if (
          callbackSource.includes('findOneAsync') ||
          callbackSource.includes('insertAsync') ||
          callbackSource.includes('updateAsync') ||
          callbackSource.includes('removeAsync') ||
          callbackSource.includes('upsertAsync') ||
          callbackSource.includes('await ')
        ) {
          // Make the callback function async if it isn't already
          if (!callback.async) {
            callback.async = true;
          }
        }
      }
    }
  }
}
