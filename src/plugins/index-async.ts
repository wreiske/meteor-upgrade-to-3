import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms Meteor collection index creation methods to their async counterparts:
 * - _ensureIndex() -> await createIndexAsync()
 * Also makes containing functions async when needed.
 */
export class IndexAsyncPlugin extends BasePlugin {
  name = 'index-async';
  description =
    'Transform collection index methods (_ensureIndex -> createIndexAsync) and add async/await';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Track functions that need to be made async
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionsToMakeAsync = new Set<any>();

    // Find and transform _ensureIndex method calls
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          property: { name: '_ensureIndex' },
        },
      })
      .forEach((path) => {
        const { node } = path;
        const memberExpr = node.callee as {
          property: { name: string };
        };

        // Change method name from _ensureIndex to createIndexAsync
        memberExpr.property.name = 'createIndexAsync';
        hasChanges = true;

        // Add await and make containing function async if needed
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
      });

    // Make marked functions async
    functionsToMakeAsync.forEach((functionPath) => {
      makeFunctionAsync(j, functionPath);
    });

    return hasChanges ? root.toSource() : undefined;
  };
}