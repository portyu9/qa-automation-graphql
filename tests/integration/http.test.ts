import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { GraphQLClient } from '../../src/client/graphql-client.js';
import { GraphQLResponseError } from '../../src/client/errors.js';
import { createGraphQLHttpServer } from '../../src/server/http-server.js';

let server: Server | undefined;
afterEach(() => new Promise<void>((resolve) => server ? server.close(() => resolve()) : resolve()));

describe('HTTP integration boundary', () => {
  it('executes against a real loopback HTTP server and propagates auth', async () => {
    server = createGraphQLHttpServer();
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const client = new GraphQLClient({ endpoint: `http://127.0.0.1:${port}/graphql`, authToken: 'user-token' });
    await expect(client.execute<{ viewer: { id: string } }>('query Viewer { viewer { id } }')).resolves.toEqual({ viewer: { id: 'u2' } });
  });

  it('preserves GraphQL authorization errors over HTTP', async () => {
    server = createGraphQLHttpServer();
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const client = new GraphQLClient({ endpoint: `http://127.0.0.1:${port}/graphql`, authToken: 'user-token' });
    const mutation = 'mutation { updateUserRole(userId: "u3", role: ADMIN) { id } }';
    await expect(client.execute(mutation)).rejects.toBeInstanceOf(GraphQLResponseError);
  });
});
