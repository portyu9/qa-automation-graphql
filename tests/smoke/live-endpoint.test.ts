import { describe, expect, it } from 'vitest';
import { GraphQLClient } from '../../src/client/graphql-client.js';
import { loadRuntimeConfig } from '../../src/config.js';

describe('explicit live GraphQL smoke', () => {
  it('executes a minimal typename probe against the configured endpoint', async () => {
    const config = loadRuntimeConfig();
    const client = new GraphQLClient(config.authToken
      ? { endpoint: config.endpoint, authToken: config.authToken, timeoutMs: config.timeoutMs }
      : { endpoint: config.endpoint, timeoutMs: config.timeoutMs });
    const data = await client.execute<{ __typename: string }>('query LiveSmoke { __typename }');
    expect(data.__typename).toBe('Query');
  });
});
