import { describe, expect, it } from 'vitest';
import { GraphQLClient } from '../../src/client/graphql-client.js';
import { GraphQLHttpError, GraphQLProtocolError, GraphQLResponseError, GraphQLTransportError } from '../../src/client/errors.js';
import { redactSecrets } from '../../src/client/redaction.js';

const query = 'query Viewer { viewer { id } }';

describe('GraphQL client', () => {
  it('returns typed data from a successful response', async () => {
    const client = new GraphQLClient({ endpoint: 'https://example.test/graphql', fetchImpl: async () => new Response(JSON.stringify({ data: { viewer: { id: 'u1' } } }), { status: 200 }) });
    await expect(client.execute<{ viewer: { id: string } }>(query)).resolves.toEqual({ viewer: { id: 'u1' } });
  });

  it('distinguishes HTTP failures', async () => {
    const client = new GraphQLClient({ endpoint: 'https://example.test/graphql', fetchImpl: async () => new Response('down', { status: 503 }) });
    await expect(client.execute(query)).rejects.toBeInstanceOf(GraphQLHttpError);
  });

  it('distinguishes malformed protocol payloads', async () => {
    const client = new GraphQLClient({ endpoint: 'https://example.test/graphql', fetchImpl: async () => new Response('not-json', { status: 200 }) });
    await expect(client.execute(query)).rejects.toBeInstanceOf(GraphQLProtocolError);
  });

  it('distinguishes GraphQL errors from transport failures', async () => {
    const graph = new GraphQLClient({ endpoint: 'https://example.test/graphql', fetchImpl: async () => new Response(JSON.stringify({ errors: [{ message: 'denied', extensions: { token: 'secret-value' } }] }), { status: 200 }) });
    await expect(graph.execute(query)).rejects.toBeInstanceOf(GraphQLResponseError);

    const transport = new GraphQLClient({ endpoint: 'https://example.test/graphql', fetchImpl: async () => { throw new Error('socket reset'); } });
    await expect(transport.execute(query)).rejects.toBeInstanceOf(GraphQLTransportError);
  });

  it('rejects credential-bearing URLs and redacts nested secrets', () => {
    expect(() => new GraphQLClient({ endpoint: 'https://user:pass@example.test/graphql' })).toThrow(/credentials/);
    expect(redactSecrets({
      authorization: 'Bearer abc',
      variables: { password: 'p', safe: 'ok' },
      message: 'request failed token="top-secret" with Bearer abc.def at https://user:password@example.test/graphql'
    })).toEqual({
      authorization: '[REDACTED]',
      variables: { password: '[REDACTED]', safe: 'ok' },
      message: 'request failed token=[REDACTED] with Bearer [REDACTED] at https://[REDACTED]@example.test/graphql'
    });
  });
});
