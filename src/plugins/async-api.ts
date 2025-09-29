import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';

/**
 * Transforms Meteor collection methods to their async counterparts:
 * - findOne() -> await findOneAsync()
 * - insert() -> await insertAsync()
 * - update() -> await updateAsync()
 * - upsert() -> await upsertAsync()
 * - remove() -> await removeAsync()
 */
export class AsyncApiPlugin extends BasePlugin {
  name = 'async-api';
  description =
    'Transform collection methods to async versions (findOne -> findOneAsync, etc.)';

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

          // TODO: Add await if not already present and function is not async
          // This is a simplified version - full implementation would need scope analysis
        });
    });

    return hasChanges ? root.toSource() : undefined;
  };
}
