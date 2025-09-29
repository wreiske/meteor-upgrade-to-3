import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';

/**
 * Transforms Meteor.user() to Meteor.userAsync():
 * - Meteor.user() -> await Meteor.userAsync()
 */
export class MeteorUserAsyncPlugin extends BasePlugin {
  name = 'meteor-user-async';
  description = 'Transform Meteor.user to Meteor.userAsync';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

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
      });

    return hasChanges ? root.toSource() : undefined;
  };
}
