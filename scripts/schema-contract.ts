import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateSchema } from 'graphql';
import { normalizedSchema, schemaFingerprint } from '../src/manifest/schema-fingerprint.js';
import { schema } from '../src/schema/schema.js';

const errors = validateSchema(schema);
if (errors.length) {
  for (const error of errors) console.error(error.message);
  process.exit(1);
}
const normalized = normalizedSchema();
if (!normalized.includes('interface Node') || !normalized.includes('union SearchResult')) {
  throw new Error('Canonical schema is missing governed interface/union contracts');
}
const fingerprint = schemaFingerprint();
const baselinePath = join(process.cwd(), 'schema', 'schema.sha256');
if (process.argv.includes('--write')) {
  writeFileSync(baselinePath, fingerprint + '\n');
} else {
  const expected = readFileSync(baselinePath, 'utf8').trim();
  if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Committed schema fingerprint is malformed');
  if (expected !== fingerprint) throw new Error('Schema fingerprint drift: expected ' + expected + ', received ' + fingerprint);
}
console.log(JSON.stringify({ schemaSha256: fingerprint, schemaBytes: Buffer.byteLength(normalized), validationErrors: 0, baseline: 'schema/schema.sha256' }));
