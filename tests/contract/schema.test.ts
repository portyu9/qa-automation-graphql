import { describe, expect, it } from 'vitest';
import { assertValidSchema, getIntrospectionQuery, graphql, isInterfaceType, isUnionType } from 'graphql';
import { schema } from '../../src/schema/schema.js';
import { normalizedSchema } from '../../src/manifest/schema-fingerprint.js';

describe('schema contracts', () => {
  it('is structurally valid and retains governed abstract types', () => {
    expect(() => assertValidSchema(schema)).not.toThrow();
    expect(isInterfaceType(schema.getType('Node'))).toBe(true);
    expect(isUnionType(schema.getType('SearchResult'))).toBe(true);
  });

  it('supports introspection for contract tooling', async () => {
    const result = await graphql({ schema, source: getIntrospectionQuery() });
    expect(result.errors).toBeUndefined();
    expect((result.data as any).__schema.queryType.name).toBe('Query');
  });

  it('normalizes schema output deterministically', () => {
    expect(normalizedSchema()).toContain('type Mutation');
    expect(normalizedSchema()).toBe(normalizedSchema());
  });
});
