import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms alanning:roles usage to Meteor 3 built-in roles API:
 * - Import statements: 'meteor/alanning:roles' -> 'meteor/roles'
 * - Method calls: Roles.method() -> await Roles.methodAsync()
 * - Adds proper async/await syntax and makes containing functions async
 */
export class RolesMigrationPlugin extends BasePlugin {
  name = 'roles-migration';
  description =
    'Transform alanning:roles to Meteor 3 built-in roles API with async support';

  // List of Roles methods that need to be converted to async variants
  private readonly roleMethods = [
    'createRole',
    'deleteRole',
    'renameRole',
    'addRolesToParent',
    'removeRolesFromParent',
    'addUsersToRoles',
    'removeUsersFromRoles',
    'setUserRoles',
    'userIsInRole',
    'getRolesForUser',
    'getUsersInRole',
    'getAllRoles',
    'isParentOf',
    'getScopesForUser',
  ];

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // Track functions that need to be made async
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionsToMakeAsync = new Set<any>();

    // 1. Transform import statements
    root.find(j.ImportDeclaration).forEach((path) => {
      const { node } = path;
      if (node.source.value === 'meteor/alanning:roles') {
        node.source.value = 'meteor/roles';
        hasChanges = true;
      }
    });

    // 2. Transform Roles method calls to async variants
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: 'Roles' },
        },
      })
      .forEach((path) => {
        const { node } = path;
        const memberExpr = node.callee as {
          property: { name: string };
        };

        const methodName = memberExpr.property.name;

        // Check if this is a method we need to convert to async
        if (this.roleMethods.includes(methodName)) {
          // Convert to async variant (add 'Async' suffix)
          memberExpr.property.name = methodName + 'Async';
          hasChanges = true;

          // Add await and make containing function async if needed
          addAwaitAndMakeAsync(j, path, functionsToMakeAsync);
        }
      });

    // Make marked functions async
    functionsToMakeAsync.forEach((functionPath) => {
      makeFunctionAsync(j, functionPath);
    });

    return hasChanges ? root.toSource() : undefined;
  };
}
