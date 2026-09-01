export class GraphQLTransportError extends Error {
  override name = 'GraphQLTransportError';
}

export class GraphQLHttpError extends Error {
  override name = 'GraphQLHttpError';
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export class GraphQLProtocolError extends Error {
  override name = 'GraphQLProtocolError';
}

export class GraphQLResponseError extends Error {
  override name = 'GraphQLResponseError';
  constructor(readonly errors: readonly unknown[]) {
    super('GraphQL response contained errors');
  }
}
