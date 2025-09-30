import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms FastRender usage to support async subscriptions:
 * - FastRender.onAllRoutes(function() { ... }) -> FastRender.onAllRoutes(async function() { ... })
 * - this.subscribe('subscriptionName') -> await this.subscribe('subscriptionName')
 * Also makes containing functions async when needed.
 */
export class FastRenderAsyncPlugin extends BasePlugin {
  name = 'fastrender-async';
  description =
    'Transform FastRender onAllRoutes handlers to async and add await to subscriptions';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Track functions that need to be made async
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionsToMakeAsync = new Set<any>();

    // Find FastRender.onAllRoutes calls
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: 'FastRender' },
          property: { name: 'onAllRoutes' },
        },
      })
      .forEach((path) => {
        const { node } = path;
        const args = node.arguments;

        // Check if the first argument is a function
        if (args.length > 0) {
          const firstArg = args[0];

          if (
            firstArg.type === 'FunctionExpression' ||
            firstArg.type === 'ArrowFunctionExpression'
          ) {
            // Make the function async if it's not already
            if (!firstArg.async) {
              firstArg.async = true;
              hasChanges = true;
            }

            // Find this.subscribe calls within the function
            j(firstArg)
              .find(j.CallExpression, {
                callee: {
                  type: 'MemberExpression',
                  object: { type: 'ThisExpression' },
                  property: { name: 'subscribe' },
                },
              })
              .forEach((subscribePath) => {
                // Add await and make containing function async if needed
                addAwaitAndMakeAsync(j, subscribePath, functionsToMakeAsync);
                hasChanges = true;
              });
          }
        }
      });

    // Find standalone this.subscribe calls that might be in FastRender contexts
    // but not in onAllRoutes (like in individual route handlers)
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { type: 'ThisExpression' },
          property: { name: 'subscribe' },
        },
      })
      .forEach((path) => {
        // Check if this subscribe call is in a FastRender context
        // by looking for FastRender in the containing function or nearby code
        let current = path;
        let inFastRenderContext = false;

        // Look up the AST to see if we're in a FastRender context
        while (current && current.parent) {
          current = current.parent;
          const node = current.value;

          // Check if we're in a function that's passed to a FastRender method
          if (
            node.type === 'CallExpression' &&
            node.callee &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object &&
            node.callee.object.type === 'Identifier' &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (node.callee.object as any).name === 'FastRender'
          ) {
            inFastRenderContext = true;
            break;
          }
        }

        // If we're in a FastRender context and not already handled by onAllRoutes,
        // add await and make the containing function async
        if (inFastRenderContext) {
          addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
          hasChanges = true;
        }
      });

    // Make marked functions async
    functionsToMakeAsync.forEach((functionPath) => {
      makeFunctionAsync(j, functionPath);
    });

    return hasChanges ? root.toSource() : undefined;
  };
}
