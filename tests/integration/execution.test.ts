import { describe, expect, it } from 'vitest';
import { executeOperation } from '../../src/schema/execute.js';
import { encodeCursor, TestStore } from '../../src/domain/store.js';

describe('GraphQL execution contracts', () => {
  it('keeps viewer nullable when unauthenticated and resolves authenticated viewers', async () => {
    const source = 'query Viewer { viewer { id role } }';
    expect((await executeOperation({ source })).data).toEqual({ viewer: null });
    expect((await executeOperation({ source, viewerId: 'u2' })).data).toEqual({ viewer: { id: 'u2', role: 'USER' } });
  });

  it('resolves Node interface and SearchResult union identities', async () => {
    const node = await executeOperation({ source: 'query { node(id: "p1") { __typename id ... on Product { priceCents } } }' });
    expect(node.data).toEqual({ node: { __typename: 'Product', id: 'p1', priceCents: 1299 } });

    const search = await executeOperation({ source: 'query { search(term: "graph") { __typename ... on Product { id name } } }' });
    expect(search.data).toEqual({ search: [{ __typename: 'Product', id: 'p1', name: 'Graph Notebook' }] });
  });

  it('enforces deterministic cursor pagination and rejects bad cursors', async () => {
    const source = 'query Users($first: Int!, $after: String) { users(first: $first, after: $after) { edges { node { id } cursor } pageInfo { hasNextPage endCursor } } }';
    const first = await executeOperation({ source, variables: { first: 2 } });
    expect((first.data as any).users.edges.map((edge: any) => edge.node.id)).toEqual(['u1', 'u2']);
    const second = await executeOperation({ source, variables: { first: 2, after: encodeCursor('u2') } });
    expect((second.data as any).users.edges.map((edge: any) => edge.node.id)).toEqual(['u3', 'u4']);
    const invalid = await executeOperation({ source, variables: { first: 2, after: 'broken' } });
    expect(invalid.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('enforces mutation authorization and isolates stores per test', async () => {
    const source = 'mutation Change($userId: ID!, $role: Role!) { updateUserRole(userId: $userId, role: $role) { id role } }';
    const denied = await executeOperation({ source, viewerId: 'u2', variables: { userId: 'u3', role: 'ADMIN' } });
    expect(denied.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

    const store = new TestStore();
    const allowed = await executeOperation({ source, viewerId: 'u1', variables: { userId: 'u3', role: 'ADMIN' }, store });
    expect(allowed.data).toEqual({ updateUserRole: { id: 'u3', role: 'ADMIN' } });
    expect(new TestStore().getUser('u3')?.role).toBe('USER');
  });
});
