const secretKey = /(authorization|cookie|token|password|secret|api[-_]?key)/i;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, secretKey.test(key) ? '[REDACTED]' : redactSecrets(item)]));
  }
  return value;
}
