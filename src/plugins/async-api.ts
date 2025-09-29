import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms Meteor collection methods to their async counterparts and adds proper async/await:
 * - findOne() -> await findOneAsync()
 * - insert() -> await insertAsync()
 * - update() -> await updateAsync()
 * - upsert() -> await upsertAsync()
 * - remove() -> await removeAsync()
 * Also makes containing functions async when needed.
 */
export class AsyncApiPlugin extends BasePlugin {
  name = 'async-api';
  description =
    'Transform collection methods to async versions (findOne -> findOneAsync, etc.) and add async/await';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Method mappings
    const methodMappings = {
      findOne: 'findOneAsync',
      insert: 'insertAsync',
      update: 'updateAsync',
      upsert: 'upsertAsync',
      remove: 'removeAsync',
    };

    // Track functions that need to be made async
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionsToMakeAsync = new Set<any>();

    // Find and transform collection method calls
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
            property: { name: string };
          };

          // Change method name
          memberExpr.property.name = newMethod;
          hasChanges = true;

          // Add await and make containing function async if needed
          addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
        });
    });

    // Make marked functions async
    functionsToMakeAsync.forEach((functionPath) => {
      makeFunctionAsync(j, functionPath);
    });

    return hasChanges ? root.toSource() : undefined;
  };
}
