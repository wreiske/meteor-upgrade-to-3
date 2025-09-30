import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';
import { addAwaitAndMakeAsync, makeFunctionAsync } from './async-utils';

/**
 * Transforms Meteor.call to Meteor.callAsync and adds proper async/await:
 * - Meteor.call() -> await Meteor.callAsync()
 * - Handles callback transformation to proper try/catch error handling
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

        // Check if the last argument is a callback function
        const args = node.arguments;
        let callbackFunction = null;
        let callbackBody = null;
        let errorParam = null;
        let resultParam = null;

        if (args.length > 0) {
          const lastArg = args[args.length - 1];
          
          // Check if last argument is a function (callback)
          if (j.FunctionExpression.check(lastArg) || j.ArrowFunctionExpression.check(lastArg)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const func = lastArg as any;
            
            // Check if it follows (error, result) callback pattern
            if (func.params && func.params.length === 2) {
              const [firstParam, secondParam] = func.params;
              
              if (j.Identifier.check(firstParam) && j.Identifier.check(secondParam)) {
                errorParam = firstParam.name;
                resultParam = secondParam.name;
                callbackFunction = func;
                callbackBody = func.body;
                
                // Remove the callback from arguments
                args.pop();
              }
            }
          }
        }

        // Change to callAsync
        memberExpr.property.name = 'callAsync';
        hasChanges = true;

        // If we have a callback, we need to transform the whole statement
        if (callbackFunction && callbackBody) {
          // The transformation will be handled after we add await
          // For now, just proceed with adding await
        }

        // Add await and make containing function async if needed
        addAwaitAndMakeAsync(j, path, functionsToMakeAsync);

        // If we had a callback, now transform the whole statement to use try/catch
        if (callbackFunction && callbackBody && errorParam && resultParam) {
          transformCallbackToTryCatch(j, path, callbackBody, errorParam, resultParam);
        }
      });

    // Make marked functions async
    functionsToMakeAsync.forEach((functionPath) => {
      makeFunctionAsync(j, functionPath);
    });

    return hasChanges ? root.toSource() : undefined;
  };
}

/**
 * Transform a Meteor.callAsync with callback to try/catch pattern
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCallbackToTryCatch(j: any, callPath: any, callbackBody: any, errorParam: string, resultParam: string) {
  // Find the statement containing this call
  let statementPath = callPath;
  while (statementPath && !j.Statement.check(statementPath.value)) {
    statementPath = statementPath.parent;
  }

  if (!statementPath) {
    return; // Can't find statement to replace
  }

  // Extract the await expression (which should be the call)
  const awaitExpression = callPath.value;
  
  // Create result variable assignment
  const resultAssignment = j.variableDeclaration('const', [
    j.variableDeclarator(j.identifier(resultParam), awaitExpression)
  ]);

  // Create try block statements
  const tryStatements = [resultAssignment];
  
  // Extract success statements from callback body
  const successStatements = extractSuccessStatements(j, callbackBody, errorParam);
  tryStatements.push(...successStatements);

  // Extract error statements from callback body  
  const errorStatements = extractErrorStatements(j, callbackBody, errorParam);

  // Create try/catch statement
  const tryCatchStatement = j.tryStatement(
    j.blockStatement(tryStatements),
    j.catchClause(
      j.identifier(errorParam),
      null, // guard parameter (not used in JS)
      j.blockStatement(errorStatements)
    )
  );

  // Replace the original statement with try/catch
  j(statementPath).replaceWith(tryCatchStatement);
}

/**
 * Extract statements that should run on success (else branch)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSuccessStatements(j: any, callbackBody: any, errorParam: string): any[] {
  const statements = [];
  
  if (j.BlockStatement.check(callbackBody)) {
    for (const stmt of callbackBody.body) {
      if (j.IfStatement.check(stmt)) {
        // If it's an if statement checking for error, extract the else part
        if (isErrorCheck(j, stmt.test, errorParam) && stmt.alternate) {
          if (j.BlockStatement.check(stmt.alternate)) {
            statements.push(...stmt.alternate.body);
          } else {
            statements.push(stmt.alternate);
          }
        }
      } else {
        // For non-if statements, assume they should run on success
        statements.push(stmt);
      }
    }
  }
  
  return statements;
}

/**
 * Extract statements that should run on error (if branch)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractErrorStatements(j: any, callbackBody: any, errorParam: string): any[] {
  const statements = [];
  
  if (j.BlockStatement.check(callbackBody)) {
    for (const stmt of callbackBody.body) {
      if (j.IfStatement.check(stmt)) {
        // If it's an if statement checking for error, extract the if part
        if (isErrorCheck(j, stmt.test, errorParam)) {
          if (j.BlockStatement.check(stmt.consequent)) {
            statements.push(...stmt.consequent.body);
          } else {
            statements.push(stmt.consequent);
          }
        }
      }
    }
  }
  
  return statements;
}

/**
 * Check if an expression is testing for error (like `if (error)` or `if (err)`)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isErrorCheck(j: any, expression: any, errorParam: string): boolean {
  return j.Identifier.check(expression) && expression.name === errorParam;
}
