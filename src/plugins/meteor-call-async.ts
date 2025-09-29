import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';

/**
 * Transforms Meteor.call to Meteor.callAsync:
 * - Meteor.call() -> await Meteor.callAsync()
 */
export class MeteorCallAsyncPlugin extends BasePlugin {
  name = 'meteor-call-async';
  description = 'Transform Meteor.call to Meteor.callAsync';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

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
      });

    return hasChanges ? root.toSource() : undefined;
  };
}
