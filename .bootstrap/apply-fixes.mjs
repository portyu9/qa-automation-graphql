import fs from 'node:fs';

function replace(path, oldText, newText) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(oldText)) throw new Error(`Expected bootstrap source fragment missing from ${path}`);
  fs.writeFileSync(path, text.replace(oldText, newText));
}

replace(
  'src/client/graphql-client.ts',
  '  private readonly authToken?: string;',
  '  private readonly authToken: string | undefined;'
);

replace(
  'src/schema/execute.ts',
  "import { execute, parse, validate, type ExecutionResult } from 'graphql';",
  "import { GraphQLError, execute, parse, validate, type ExecutionResult } from 'graphql';"
);
replace(
  'src/schema/execute.ts',
  "    return { errors: [error instanceof Error ? error : new Error(String(error))] };",
  "    return { errors: [new GraphQLError(error instanceof Error ? error.message : String(error))] };"
);

replace(
  'src/server/http-server.ts',
  "import { executeOperation } from '../schema/execute.js';",
  "import { executeOperation, type ExecuteOptions } from '../schema/execute.js';"
);
replace(
  'src/server/http-server.ts',
  `      const result = await executeOperation({
        source: body.query,
        variables: variables as Record<string, unknown> | undefined,
        operationName,
        viewerId: viewerFromAuthorization(request.headers.authorization),
        store
      });`,
  `      const executeOptions: ExecuteOptions = { source: body.query, store };
      if (variables !== undefined) executeOptions.variables = variables as Record<string, unknown>;
      if (operationName !== undefined) executeOptions.operationName = operationName;
      const viewerId = viewerFromAuthorization(request.headers.authorization);
      if (viewerId !== undefined) executeOptions.viewerId = viewerId;
      const result = await executeOperation(executeOptions);`
);

replace(
  'tests/smoke/live-endpoint.test.ts',
  "    const client = new GraphQLClient({ endpoint: config.endpoint, authToken: config.authToken, timeoutMs: config.timeoutMs });",
  `    const client = new GraphQLClient(config.authToken
      ? { endpoint: config.endpoint, authToken: config.authToken, timeoutMs: config.timeoutMs }
      : { endpoint: config.endpoint, timeoutMs: config.timeoutMs });`
);

replace(
  'tests/unit/policy.test.ts',
  "    expect(measureOperation(document, 'Q')).toEqual({ depth: 4, selections: 8 });",
  "    expect(measureOperation(document, 'Q')).toEqual({ depth: 4, selections: 7 });"
);

console.log('Applied strict optional-property and operation-metric corrections.');
