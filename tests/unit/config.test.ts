import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig } from '../../src/config.js';

describe('runtime configuration', () => {
  it('uses deterministic loopback defaults', () => {
    const config = loadRuntimeConfig({});
    expect(config.endpoint.href).toBe('http://127.0.0.1:4000/graphql');
    expect(config.timeoutMs).toBe(10_000);
  });

  it('rejects unsafe endpoint and credential-routing state', () => {
    expect(() => loadRuntimeConfig({ GRAPHQL_ENDPOINT: 'https://user:pass@example.test/graphql' })).toThrow(/credentials/);
    expect(() => loadRuntimeConfig({ GRAPHQL_ENDPOINT: 'https://example.test/graphql?token=x' })).toThrow(/query or fragment/);
    expect(() => loadRuntimeConfig({
      GRAPHQL_ENDPOINT: 'https://api.example.test/graphql',
      GRAPHQL_AUTH_TOKEN: 'secret-at-runtime'
    })).toThrow(/GRAPHQL_AUTH_ALLOWED_HOSTS is required/);
    expect(() => loadRuntimeConfig({
      GRAPHQL_ENDPOINT: 'https://api.example.test/graphql',
      GRAPHQL_AUTH_TOKEN: 'secret-at-runtime',
      GRAPHQL_AUTH_ALLOWED_HOSTS: 'other.example.test'
    })).toThrow(/not authorized/);
    expect(() => loadRuntimeConfig({
      GRAPHQL_ENDPOINT: 'https://api.example.test/graphql',
      GRAPHQL_AUTH_TOKEN: 'secret-at-runtime',
      GRAPHQL_AUTH_ALLOWED_HOSTS: 'https://api.example.test'
    })).toThrow(/hostnames only/);

    const config = loadRuntimeConfig({
      GRAPHQL_ENDPOINT: 'https://api.example.test/graphql',
      GRAPHQL_AUTH_TOKEN: 'secret-at-runtime',
      GRAPHQL_AUTH_ALLOWED_HOSTS: 'api.example.test, backup.example.test'
    });
    expect(config.authToken).toBe('secret-at-runtime');
  });

  it('validates timeout values', () => {
    expect(() => loadRuntimeConfig({ GRAPHQL_TIMEOUT_MS: '0' })).toThrow(/positive integer/);
    expect(() => loadRuntimeConfig({ GRAPHQL_TIMEOUT_MS: 'abc' })).toThrow(/positive integer/);
  });
});
