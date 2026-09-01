import { parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { enforceOperationLimits, measureOperation } from '../../src/policy/operation-policy.js';

describe('operation policy', () => {
  it('measures nested selections deterministically', () => {
    const document = parse('query Q { users { edges { node { id name } } pageInfo { hasNextPage } } }');
    expect(measureOperation(document, 'Q')).toEqual({ depth: 4, selections: 7 });
  });

  it('fails closed when depth exceeds the configured limit', () => {
    const document = parse('query Q { users { edges { node { id } } } }');
    expect(() => enforceOperationLimits(document, 'Q', { maxDepth: 3, maxSelections: 20 })).toThrow(/depth/);
  });

  it('fails closed when selection count exceeds the configured limit', () => {
    const document = parse('query Q { viewer { id name email role } }');
    expect(() => enforceOperationLimits(document, 'Q', { maxDepth: 10, maxSelections: 3 })).toThrow(/selection count/);
  });

  it('requires operationName for multi-operation documents', () => {
    const document = parse('query A { viewer { id } } query B { viewer { name } }');
    expect(() => measureOperation(document)).toThrow(/operationName/);
  });
});
