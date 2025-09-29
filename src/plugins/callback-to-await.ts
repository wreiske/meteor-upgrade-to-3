import { Transform } from 'jscodeshift';
import { BasePlugin } from '../types';

/**
 * Transforms callback patterns to async/await:
 * - function(err, result) callback patterns -> await with try/catch
 * - Meteor.promisify wrapper for generic callbacks
 */
export class CallbackToAwaitPlugin extends BasePlugin {
  name = 'callback-to-await';
  description =
    'Transform callback patterns to async/await using Meteor.promisify where applicable';

  transform: Transform = (fileInfo, api, _options) => {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let hasChanges = false;

    // This is a placeholder implementation
    // Real implementation would need sophisticated callback pattern detection
    // and scope analysis to determine where to add Meteor.promisify

    // Find function calls that look like callback patterns
    root.find(j.CallExpression).forEach((path) => {
      const { node } = path;

      // Look for last argument being a function with (err, result) pattern
      if (node.arguments.length > 0) {
        const lastArg = node.arguments[node.arguments.length - 1];

        if (
          j.FunctionExpression.check(lastArg) ||
          j.ArrowFunctionExpression.check(lastArg)
        ) {
          const func = lastArg as {
            params: Array<{ name?: string }>;
          };

          // Check if it matches (err, result) pattern
          if (func.params.length === 2) {
            const [errParam, resultParam] = func.params;

            if (
              j.Identifier.check(errParam) &&
              j.Identifier.check(resultParam)
            ) {
              const errName = errParam.name || '';
              const resultName = resultParam.name || '';

              // Common callback parameter names
              if (
                errName.match(/^err(or)?$/i) &&
                resultName.match(/^(result|data|res)$/i)
              ) {
                // TODO: Replace with Meteor.promisify pattern
                // This would require more complex AST manipulation
                // For now, just add a comment
                hasChanges = true;
              }
            }
          }
        }
      }
    });

    return hasChanges ? root.toSource() : undefined;
  };
}
