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

function parseAuthAllowedHosts(value: string | undefined): ReadonlySet<string> {
  if (value === undefined || value.trim() === '') return new Set();

  const hosts = value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
    .map((host) => {
      if (host.includes('://') || /[/?#@]/.test(host)) {
        throw new Error('GRAPHQL_AUTH_ALLOWED_HOSTS entries must be hostnames only, without scheme, credentials, path, query, or fragment');
      }
      const candidate = new URL(`http://${host}`);
      if (candidate.port) throw new Error('GRAPHQL_AUTH_ALLOWED_HOSTS entries must not include ports');
      return candidate.hostname.toLowerCase();
    });

  if (hosts.length === 0) throw new Error('GRAPHQL_AUTH_ALLOWED_HOSTS must contain at least one hostname');
  return new Set(hosts);
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const rawEndpoint = env.GRAPHQL_ENDPOINT ?? 'http://127.0.0.1:4000/graphql';
  const endpoint = new URL(rawEndpoint);
  if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('GRAPHQL_ENDPOINT must use http or https');
  if (endpoint.username || endpoint.password) throw new Error('GRAPHQL_ENDPOINT must not embed credentials');
  if (endpoint.search || endpoint.hash) throw new Error('GRAPHQL_ENDPOINT must not include query or fragment components');

  const authToken = env.GRAPHQL_AUTH_TOKEN?.trim();
  if (authToken) {
    const allowedHosts = parseAuthAllowedHosts(env.GRAPHQL_AUTH_ALLOWED_HOSTS);
    if (allowedHosts.size === 0) {
      throw new Error('GRAPHQL_AUTH_ALLOWED_HOSTS is required when GRAPHQL_AUTH_TOKEN is set');
    }
    if (!allowedHosts.has(endpoint.hostname.toLowerCase())) {
      throw new Error(`GRAPHQL_ENDPOINT host ${endpoint.hostname} is not authorized to receive GRAPHQL_AUTH_TOKEN`);
    }
  }

  const config: RuntimeConfig = {
    endpoint,
    timeoutMs: parsePositiveInteger(env.GRAPHQL_TIMEOUT_MS, 10_000, 'GRAPHQL_TIMEOUT_MS')
  };
  if (authToken) config.authToken = authToken;
  return config;
}
