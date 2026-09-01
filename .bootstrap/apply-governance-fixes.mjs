import fs from 'node:fs';

function replace(path, oldText, newText) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(oldText)) throw new Error(`Expected governance source fragment missing from ${path}`);
  fs.writeFileSync(path, text.replace(oldText, newText));
}

replace(
  'src/schema/schema.ts',
  "import { readFileSync } from 'node:fs';",
  "import { existsSync, readFileSync } from 'node:fs';"
);
replace(
  'src/schema/schema.ts',
  "const schemaPath = fileURLToPath(new URL('../../schema/schema.graphql', import.meta.url));\nconst schemaSource = readFileSync(schemaPath, 'utf8');",
  `const schemaCandidates = [
  fileURLToPath(new URL('../../schema/schema.graphql', import.meta.url)),
  fileURLToPath(new URL('../../../schema/schema.graphql', import.meta.url))
];
const schemaPath = schemaCandidates.find((candidate) => existsSync(candidate));
if (!schemaPath) throw new Error('Canonical schema/schema.graphql could not be resolved from source or compiled runtime');
const schemaSource = readFileSync(schemaPath, 'utf8');`
);

fs.writeFileSync('scripts/schema-contract.ts', `import { readFileSync, writeFileSync } from 'node:fs';
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
  writeFileSync(baselinePath, fingerprint + '\\n');
} else {
  const expected = readFileSync(baselinePath, 'utf8').trim();
  if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Committed schema fingerprint is malformed');
  if (expected !== fingerprint) throw new Error('Schema fingerprint drift: expected ' + expected + ', received ' + fingerprint);
}
console.log(JSON.stringify({ schemaSha256: fingerprint, schemaBytes: Buffer.byteLength(normalized), validationErrors: 0, baseline: 'schema/schema.sha256' }));
`);

fs.writeFileSync('scripts/operation-manifest.ts', `import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOperationManifest } from '../src/manifest/operations.js';

const manifest = buildOperationManifest();
if (manifest.length < 4) throw new Error('Expected at least 4 governed operations, found ' + manifest.length);
const names = new Set(manifest.map((entry) => entry.name));
if (names.size !== manifest.length) throw new Error('Operation names must be unique');
const payload = { operations: manifest };
const normalized = JSON.stringify(payload, null, 2) + '\\n';
const baselinePath = join(process.cwd(), 'operations', 'manifest.json');
if (process.argv.includes('--write')) {
  writeFileSync(baselinePath, normalized);
} else {
  const committed = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (JSON.stringify(committed) !== JSON.stringify(payload)) {
    throw new Error('Persisted operation manifest drift detected; refresh the governed manifest intentionally');
  }
}
console.log(normalized.trim());
`);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts['schema:refresh'] = 'npm run build && node dist/scripts/schema-contract.js --write';
packageJson.scripts['manifest:refresh'] = 'npm run build && node dist/scripts/operation-manifest.js --write';
fs.writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

console.log('Applied compiled-schema resolution and committed fingerprint governance.');
