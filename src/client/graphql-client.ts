import { GraphQLHttpError, GraphQLProtocolError, GraphQLResponseError, GraphQLTransportError } from './errors.js';
import { redactSecrets } from './redaction.js';

interface GraphQLPayload<T> {
  data?: T;
  errors?: unknown[];
}

export interface GraphQLClientOptions {
  endpoint: URL | string;
  authToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class GraphQLClient {
  readonly endpoint: URL;
  private readonly authToken: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GraphQLClientOptions) {
    this.endpoint = new URL(options.endpoint);
    if (!['http:', 'https:'].includes(this.endpoint.protocol)) throw new Error('GraphQL endpoint must use http or https');
    if (this.endpoint.username || this.endpoint.password) throw new Error('GraphQL endpoint must not embed credentials');
    this.authToken = options.authToken;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute<T>(query: string, variables: Record<string, unknown> = {}, operationName?: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/graphql-response+json, application/json' };
    if (this.authToken) headers.authorization = `Bearer ${this.authToken}`;
    try {
      let response: Response;
      try {
        response = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables, operationName }),
          signal: controller.signal
        });
      } catch (error) {
        throw new GraphQLTransportError(`GraphQL request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!response.ok) throw new GraphQLHttpError(response.status, `GraphQL HTTP request failed with status ${response.status}`);
      let payload: GraphQLPayload<T>;
      try {
        payload = await response.json() as GraphQLPayload<T>;
      } catch {
        throw new GraphQLProtocolError('GraphQL response was not valid JSON');
      }
      if (!payload || typeof payload !== 'object') throw new GraphQLProtocolError('GraphQL response was not an object');
      if (payload.errors?.length) throw new GraphQLResponseError(redactSecrets(payload.errors) as unknown[]);
      if (!('data' in payload)) throw new GraphQLProtocolError('GraphQL response did not contain data or errors');
      return payload.data as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
