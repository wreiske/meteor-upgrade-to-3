import { RolesMigrationPlugin } from '../../plugins/roles-migration';
import jscodeshift from 'jscodeshift';

describe('RolesMigrationPlugin', () => {
  let plugin: RolesMigrationPlugin;

  beforeEach(() => {
    plugin = new RolesMigrationPlugin();
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(plugin.name).toBe('roles-migration');
      expect(plugin.description).toContain('alanning:roles');
      expect(plugin.description).toContain('Meteor 3');
    });
  });

  describe('transform', () => {
    const runTransform = (source: string) => {
      return plugin.transform(
        { source, path: 'test.js' },
        { jscodeshift, j: jscodeshift, stats: () => {}, report: () => {} },
        {}
      );
    };

    describe('import transformation', () => {
      it('should transform alanning:roles import to meteor/roles', () => {
        const input = `import { Roles } from 'meteor/alanning:roles';`;
        const result = runTransform(input);
        
        expect(result).toContain(`import { Roles } from "meteor/roles";`);
      });

      it('should handle multiple imports on same line', () => {
        const input = `import { Roles, GLOBAL_GROUP } from 'meteor/alanning:roles';`;
        const result = runTransform(input);
        
        expect(result).toContain(`import { Roles, GLOBAL_GROUP } from "meteor/roles";`);
      });

      it('should not modify other meteor imports', () => {
        const input = `import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import { check } from 'meteor/check';`;
        const result = runTransform(input);
        
        expect(result).toContain(`import { Meteor } from 'meteor/meteor';`);
        expect(result).toContain(`import { Roles } from "meteor/roles";`);
        expect(result).toContain(`import { check } from 'meteor/check';`);
      });
    });

    describe('roles method transformation', () => {
      it('should transform createRole to createRoleAsync', () => {
        const input = `
function setupRoles() {
  Roles.createRole("admin");
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function setupRoles');
        expect(result).toContain('await Roles.createRoleAsync');
      });

      it('should transform userIsInRole to userIsInRoleAsync', () => {
        const input = `
function checkPermission(userId) {
  return Roles.userIsInRole(userId, 'admin');
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function checkPermission');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });

      it('should transform addUsersToRoles to addUsersToRolesAsync', () => {
        const input = `
function assignRole(userId) {
  Roles.addUsersToRoles(userId, ['admin']);
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function assignRole');
        expect(result).toContain('await Roles.addUsersToRolesAsync');
      });

      it('should transform removeUsersFromRoles to removeUsersFromRolesAsync', () => {
        const input = `
function removeRole(userId) {
  Roles.removeUsersFromRoles(userId, ['admin']);
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function removeRole');
        expect(result).toContain('await Roles.removeUsersFromRolesAsync');
      });

      it('should transform getRolesForUser to getRolesForUserAsync', () => {
        const input = `
function getUserRoles(userId) {
  return Roles.getRolesForUser(userId);
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function getUserRoles');
        expect(result).toContain('await Roles.getRolesForUserAsync');
      });

      it('should transform getAllRoles to getAllRolesAsync', () => {
        const input = `
function listRoles() {
  return Roles.getAllRoles();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function listRoles');
        expect(result).toContain('await Roles.getAllRolesAsync');
      });

      it('should transform addRolesToParent to addRolesToParentAsync', () => {
        const input = `
function setupHierarchy() {
  Roles.addRolesToParent('view-user', 'admin');
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function setupHierarchy');
        expect(result).toContain('await Roles.addRolesToParentAsync');
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple roles calls in same function', () => {
        const input = `
function manageRoles(userId) {
  Roles.createRole("manager");
  Roles.addUsersToRoles(userId, ["manager"]);
  return Roles.userIsInRole(userId, "manager");
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function manageRoles');
        expect(result).toContain('await Roles.createRoleAsync');
        expect(result).toContain('await Roles.addUsersToRolesAsync');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });

      it('should handle arrow functions', () => {
        const input = `
const checkAdmin = (userId) => {
  return Roles.userIsInRole(userId, 'admin');
};`;
        const result = runTransform(input);
        
        expect(result).toContain('async userId =>');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });

      it('should handle method definitions', () => {
        const input = `
class UserManager {
  checkRole(userId) {
    return Roles.userIsInRole(userId, 'admin');
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async checkRole');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });

      it('should handle scoped roles from the issue example', () => {
        const input = `
async function setupTeamRoles() {
  await Roles.createRole("user");
  await Roles.createRole("admin");
  
  Roles.addUsersToRoles(userId, ["manage-team"], "team-a");
  Roles.addUsersToRoles(userId, ["player"], "team-b");
  
  const canManageA = Roles.userIsInRole(userId, "manage-team", "team-a");
  const canManageB = Roles.userIsInRole(userId, "manage-team", "team-b");
}`;
        const result = runTransform(input);
        
        expect(result).toContain('await Roles.addUsersToRolesAsync');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });
    });

    describe('integration with imports', () => {
      it('should handle both import and method transformations', () => {
        const input = `
import { Roles } from 'meteor/alanning:roles';

function setupSystem() {
  Roles.createRole("admin");
  Roles.createRole("user");
}`;
        const result = runTransform(input);
        
        expect(result).toContain(`import { Roles } from "meteor/roles";`);
        expect(result).toContain('async function setupSystem');
        expect(result).toContain('await Roles.createRoleAsync');
      });
    });

    describe('no changes scenarios', () => {
      it('should return undefined when no changes needed', () => {
        const input = 'const test = "hello world";';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify unrelated Roles-like calls', () => {
        const input = 'const roles = someObject.Roles.getData();';
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not modify already async Roles methods', () => {
        const input = `
async function test() {
  const result = await Roles.createRoleAsync("admin");
  return result;
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });

      it('should not transform non-Roles method calls', () => {
        const input = `
function test() {
  const result = SomeOtherObject.createRole("test");
  return result;
}`;
        const result = runTransform(input);
        
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle Roles calls in conditional statements', () => {
        const input = `
function checkAuth(userId) {
  if (Roles.userIsInRole(userId, 'admin')) {
    return true;
  }
  return false;
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function checkAuth');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });

      it('should handle Roles calls in try-catch blocks', () => {
        const input = `
function safeRoleCheck(userId) {
  try {
    return Roles.userIsInRole(userId, 'admin');
  } catch (error) {
    return false;
  }
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function safeRoleCheck');
        expect(result).toContain('await Roles.userIsInRoleAsync');
      });

      it('should handle nested function calls', () => {
        const input = `
function outer() {
  function inner() {
    return Roles.userIsInRole(userId, 'admin');
  }
  return inner();
}`;
        const result = runTransform(input);
        
        expect(result).toContain('async function inner');
        expect(result).toContain('await Roles.userIsInRoleAsync');
        // outer function should remain unchanged if it doesn't have direct roles calls
      });
    });
  });
});