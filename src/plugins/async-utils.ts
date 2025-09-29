/**
 * Shared utilities for async/await transformations
 */

/**
 * Check if the call expression is already awaited
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAlreadyAwaited(path: any): boolean {
  return path.parent.value.type === 'AwaitExpression';
}

/**
 * Find the containing function for a given path
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findContainingFunction(path: any): any {
  let current = path;
  while (current && current.parent) {
    current = current.parent;
    const node = current.value;

    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'MethodDefinition' ||
      (node.type === 'Property' &&
        (node.value?.type === 'FunctionExpression' ||
          node.value?.type === 'ArrowFunctionExpression'))
    ) {
      return current;
    }
  }
  return null;
}

/**
 * Check if a function is already async
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAlreadyAsync(functionPath: any): boolean {
  const node = functionPath.value;

  if (
    node.type === 'MethodDefinition' ||
    (node.type === 'Property' && node.value)
  ) {
    const func = node.value || node;
    return func.async === true;
  }

  return node.async === true;
}

/**
 * Make a function async
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeFunctionAsync(j: any, functionPath: any): void {
  const node = functionPath.value;

  if (node.type === 'MethodDefinition') {
    // Class method
    node.value.async = true;
  } else if (node.type === 'Property' && node.value) {
    // Object method
    node.value.async = true;
  } else if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    // Regular function
    node.async = true;
  }
}

/**
 * Add await and make containing function async if needed
 */
export function addAwaitAndMakeAsync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  j: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionsToMakeAsync: Set<any>
): void {
  const { node } = path;

  // Add await if not already present
  if (!isAlreadyAwaited(path)) {
    const awaitExpression = j.awaitExpression(node);
    j(path).replaceWith(awaitExpression);

    // Find the containing function and mark it to be made async
    const containingFunction = findContainingFunction(path);
    if (containingFunction && !isAlreadyAsync(containingFunction)) {
      functionsToMakeAsync.add(containingFunction);
    }
  }
}
