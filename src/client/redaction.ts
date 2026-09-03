const secretKey = /(authorization|cookie|token|password|secret|api[-_]?key)/i;
const secretAssignment = /((?:authorization|cookie|token|password|secret|api[-_]?key)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const bearerToken = /\b(Bearer)\s+[^\s,;]+/gi;
const urlCredentials = /\b(https?:\/\/)[^\s/:@]+:[^\s/@]+@/gi;

function redactDiagnosticText(value: string): string {
  return value
    .replace(urlCredentials, '$1[REDACTED]@')
    .replace(bearerToken, '$1 [REDACTED]')
    .replace(secretAssignment, '$1[REDACTED]');
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, secretKey.test(key) ? '[REDACTED]' : redactSecrets(item)]));
  }
  return typeof value === 'string' ? redactDiagnosticText(value) : value;
}
