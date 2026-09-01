import { Kind, type DocumentNode, type FragmentDefinitionNode, type OperationDefinitionNode, type SelectionSetNode } from 'graphql';

export interface OperationLimits {
  maxDepth: number;
  maxSelections: number;
}

export const defaultOperationLimits: OperationLimits = { maxDepth: 8, maxSelections: 60 };

function operationFromDocument(document: DocumentNode, operationName?: string): OperationDefinitionNode {
  const operations = document.definitions.filter((definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION);
  if (operationName) {
    const selected = operations.find((operation) => operation.name?.value === operationName);
    if (!selected) throw new Error(`Operation ${operationName} was not found`);
    return selected;
  }
  if (operations.length !== 1) throw new Error('operationName is required when a document contains multiple operations');
  return operations[0]!;
}

export function measureOperation(document: DocumentNode, operationName?: string): { depth: number; selections: number } {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments.set(definition.name.value, definition);
  }
  const operation = operationFromDocument(document, operationName);
  let selections = 0;
  const visit = (set: SelectionSetNode, depth: number, fragmentStack: Set<string>): number => {
    let maximum = depth;
    for (const selection of set.selections) {
      selections += 1;
      if (selection.kind === Kind.FIELD && selection.selectionSet) {
        maximum = Math.max(maximum, visit(selection.selectionSet, depth + 1, fragmentStack));
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        maximum = Math.max(maximum, visit(selection.selectionSet, depth + 1, fragmentStack));
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        if (fragmentStack.has(selection.name.value)) continue;
        const fragment = fragments.get(selection.name.value);
        if (fragment) {
          const next = new Set(fragmentStack);
          next.add(selection.name.value);
          maximum = Math.max(maximum, visit(fragment.selectionSet, depth + 1, next));
        }
      }
    }
    return maximum;
  };
  return { depth: visit(operation.selectionSet, 1, new Set()), selections };
}

export function enforceOperationLimits(document: DocumentNode, operationName?: string, limits: OperationLimits = defaultOperationLimits): void {
  const metrics = measureOperation(document, operationName);
  if (metrics.depth > limits.maxDepth) throw new Error(`Operation depth ${metrics.depth} exceeds limit ${limits.maxDepth}`);
  if (metrics.selections > limits.maxSelections) throw new Error(`Operation selection count ${metrics.selections} exceeds limit ${limits.maxSelections}`);
}
