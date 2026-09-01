import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig } from '../../src/config.js';

describe('runtime configuration', () => {
  it('uses deterministic loopback defaults', () => {
    const config = loadRuntimeConfig({});
    expect(config.endpoint.href).toBe('http://127.0.0.1:4000/graphql');
    expect(config.timeoutMs).toBe(10_000);
  });

  it('rejects credentials and query components in endpoints', () => {
    expect(() => loadRuntimeConfig({ GRAPHQL_ENDPOINT: 'https://user:pass@example.test/graphql' })).toThrow(/credentials/);
    expect(() => loadRuntimeConfig({ GRAPHQL_ENDPOINT: 'https://example.test/graphql?token=x' })).toThrow(/query or fragment/);
  });

  it('validates timeout values', () => {
    expect(() => loadRuntimeConfig({ GRAPHQL_TIMEOUT_MS: '0' })).toThrow(/positive integer/);
    expect(() => loadRuntimeConfig({ GRAPHQL_TIMEOUT_MS: 'abc' })).toThrow(/positive integer/);
  });
});
