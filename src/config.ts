export interface RuntimeConfig {
  endpoint: URL;
  authToken?: string;
  timeoutMs: number;
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const rawEndpoint = env.GRAPHQL_ENDPOINT ?? 'http://127.0.0.1:4000/graphql';
  const endpoint = new URL(rawEndpoint);
  if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('GRAPHQL_ENDPOINT must use http or https');
  if (endpoint.username || endpoint.password) throw new Error('GRAPHQL_ENDPOINT must not embed credentials');
  if (endpoint.search || endpoint.hash) throw new Error('GRAPHQL_ENDPOINT must not include query or fragment components');

  const config: RuntimeConfig = {
    endpoint,
    timeoutMs: parsePositiveInteger(env.GRAPHQL_TIMEOUT_MS, 10_000, 'GRAPHQL_TIMEOUT_MS')
  };
  if (env.GRAPHQL_AUTH_TOKEN) config.authToken = env.GRAPHQL_AUTH_TOKEN;
  return config;
}
