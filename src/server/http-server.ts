import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { executeOperation, type ExecuteOptions } from '../schema/execute.js';
import { TestStore } from '../domain/store.js';

interface RequestBody {
  query?: unknown;
  variables?: unknown;
  operationName?: unknown;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new Error('Request body exceeds 1 MB');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/graphql-response+json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function viewerFromAuthorization(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7);
  if (token === 'admin-token') return 'u1';
  if (token === 'user-token') return 'u2';
  return undefined;
}

export function createGraphQLHttpServer(store = new TestStore()): Server {
  return createServer(async (request, response) => {
    if (request.url !== '/graphql') return writeJson(response, 404, { error: 'Not found' });
    if (request.method !== 'POST') return writeJson(response, 405, { error: 'Method not allowed' });
    try {
      const body = JSON.parse(await readBody(request)) as RequestBody;
      if (typeof body.query !== 'string') return writeJson(response, 400, { error: 'query must be a string' });
      const variables = body.variables === undefined ? undefined : body.variables;
      if (variables !== undefined && (!variables || typeof variables !== 'object' || Array.isArray(variables))) {
        return writeJson(response, 400, { error: 'variables must be an object' });
      }
      const operationName = typeof body.operationName === 'string' ? body.operationName : undefined;
      const executeOptions: ExecuteOptions = { source: body.query, store };
      if (variables !== undefined) executeOptions.variables = variables as Record<string, unknown>;
      if (operationName !== undefined) executeOptions.operationName = operationName;
      const viewerId = viewerFromAuthorization(request.headers.authorization);
      if (viewerId !== undefined) executeOptions.viewerId = viewerId;
      const result = await executeOperation(executeOptions);
      writeJson(response, 200, result);
    } catch (error) {
      writeJson(response, error instanceof SyntaxError ? 400 : 413, { error: error instanceof Error ? error.message : 'Request failed' });
    }
  });
}
