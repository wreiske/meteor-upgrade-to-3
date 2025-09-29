import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms Meteor.call to Meteor.callAsync and adds proper async/await:
 * - Meteor.call() -> await Meteor.callAsync()
 * Also makes containing functions async when needed.
 */
export class MeteorCallAsyncPlugin extends BasePlugin {
  name = 'meteor-call-async';
  description = 'Transform Meteor.call to Meteor.callAsync and add async/await';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Track functions that need to be made async
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionsToMakeAsync = new Set<any>();

    // Find Meteor.call expressions
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: 'Meteor' },
          property: { name: 'call' },
        },
      })
      .forEach((path) => {
        const { node } = path;
        const memberExpr = node.callee as {
          property: { name: string };
        };

        // Change to callAsync
        memberExpr.property.name = 'callAsync';
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
