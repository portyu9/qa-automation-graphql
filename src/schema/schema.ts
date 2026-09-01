import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSchema, GraphQLError, GraphQLInterfaceType, GraphQLUnionType } from 'graphql';
import type { Role, TestStore, UserRecord } from '../domain/store.js';
import { decodeCursor, encodeCursor } from '../domain/store.js';

const schemaCandidates = [
  fileURLToPath(new URL('../../schema/schema.graphql', import.meta.url)),
  fileURLToPath(new URL('../../../schema/schema.graphql', import.meta.url))
];
const schemaPath = schemaCandidates.find((candidate) => existsSync(candidate));
if (!schemaPath) throw new Error('Canonical schema/schema.graphql could not be resolved from source or compiled runtime');
const schemaSource = readFileSync(schemaPath, 'utf8');
export const schema = buildSchema(schemaSource);

(schema.getType('Node') as GraphQLInterfaceType).resolveType = (value) => (value as { __typename: string }).__typename;
(schema.getType('SearchResult') as GraphQLUnionType).resolveType = (value) => (value as { __typename: string }).__typename;

export interface GraphQLContext {
  store: TestStore;
  viewer?: UserRecord;
}

function requireAdmin(context: GraphQLContext): UserRecord {
  if (context.viewer?.role !== 'ADMIN') {
    throw new GraphQLError('Administrator privileges are required', { extensions: { code: 'FORBIDDEN' } });
  }
  return context.viewer;
}

export const rootValue = {
  viewer(_args: unknown, context: GraphQLContext) {
    return context.viewer ?? null;
  },
  node({ id }: { id: string }, context: GraphQLContext) {
    return context.store.getNode(id) ?? null;
  },
  users({ first, after }: { first?: number; after?: string | null }, context: GraphQLContext) {
    const size = first ?? 2;
    if (!Number.isInteger(size) || size < 1 || size > 50) {
      throw new GraphQLError('first must be an integer between 1 and 50', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    let start = 0;
    if (after) {
      let id: string;
      try {
        id = decodeCursor(after);
      } catch {
        throw new GraphQLError('after is not a valid user cursor', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const index = context.store.users.findIndex((user) => user.id === id);
      if (index < 0) throw new GraphQLError('after references an unknown user', { extensions: { code: 'BAD_USER_INPUT' } });
      start = index + 1;
    }
    const nodes = context.store.users.slice(start, start + size);
    const edges = nodes.map((node) => ({ cursor: encodeCursor(node.id), node }));
    return {
      edges,
      pageInfo: {
        hasNextPage: start + nodes.length < context.store.users.length,
        endCursor: edges.at(-1)?.cursor ?? null
      }
    };
  },
  search({ term }: { term: string }, context: GraphQLContext) {
    return context.store.search(term);
  },
  updateUserRole({ userId, role }: { userId: string; role: Role }, context: GraphQLContext) {
    requireAdmin(context);
    const user = context.store.updateUserRole(userId, role);
    if (!user) throw new GraphQLError('User does not exist', { extensions: { code: 'BAD_USER_INPUT' } });
    return user;
  }
};
