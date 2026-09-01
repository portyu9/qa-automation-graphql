import { GraphQLError, execute, parse, validate, type ExecutionResult } from 'graphql';
import { TestStore } from '../domain/store.js';
import { enforceOperationLimits, type OperationLimits } from '../policy/operation-policy.js';
import { rootValue, schema, type GraphQLContext } from './schema.js';

export interface ExecuteOptions {
  source: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  viewerId?: string;
  store?: TestStore;
  limits?: OperationLimits;
}

export async function executeOperation(options: ExecuteOptions): Promise<ExecutionResult> {
  const document = parse(options.source);
  const validationErrors = validate(schema, document);
  if (validationErrors.length) return { errors: validationErrors };
  try {
    enforceOperationLimits(document, options.operationName, options.limits);
  } catch (error) {
    return { errors: [new GraphQLError(error instanceof Error ? error.message : String(error))] };
  }
  const store = options.store ?? new TestStore();
  const context: GraphQLContext = { store };
  if (options.viewerId) {
    const viewer = store.getUser(options.viewerId);
    if (viewer) context.viewer = viewer;
  }
  return await execute({
    schema,
    document,
    rootValue,
    contextValue: context,
    variableValues: options.variables,
    operationName: options.operationName
  });
}
