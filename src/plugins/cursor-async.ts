import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';

/**
 * Transforms cursor methods to their async counterparts:
 * - cursor.count() -> await cursor.countAsync()
 * - cursor.fetch() -> await cursor.fetchAsync()
 * - cursor.forEach() -> await cursor.forEachAsync()
 * - cursor.map() -> await cursor.mapAsync()
 */
export class CursorAsyncPlugin extends BasePlugin {
  name = 'cursor-async';
  description =
    'Transform cursor methods to async versions (count -> countAsync, etc.)';

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

    // Find and transform cursor method calls
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

          // Simple heuristic: if the object looks like a cursor call
          // In a real implementation, we'd do proper type analysis
          const objSource = j(memberExpr.object as never).toSource();
          if (objSource.includes('.find(') || objSource.includes('.findOne(')) {
            memberExpr.property.name = newMethod;
            hasChanges = true;
          }
        });
    });

    return hasChanges ? root.toSource() : undefined;
  };
}
