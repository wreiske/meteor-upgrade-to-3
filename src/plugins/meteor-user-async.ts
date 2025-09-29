import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms Meteor.user() to Meteor.userAsync() and adds proper async/await:
 * - Meteor.user() -> await Meteor.userAsync()
 * Also makes containing functions async when needed.
 */
export class MeteorUserAsyncPlugin extends BasePlugin {
  name = 'meteor-user-async';
  description = 'Transform Meteor.user to Meteor.userAsync and add async/await';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Track functions that need to be made async
    const functionsToMakeAsync = new Set<any>();

    // Find Meteor.user expressions
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: 'Meteor' },
          property: { name: 'user' },
        },
      })
      .forEach((path) => {
        const { node } = path;
        const memberExpr = node.callee as {
          property: { name: string };
        };

        // Change to userAsync
        memberExpr.property.name = 'userAsync';
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
