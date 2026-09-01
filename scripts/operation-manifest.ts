import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOperationManifest } from '../src/manifest/operations.js';

const manifest = buildOperationManifest();
if (manifest.length < 4) throw new Error('Expected at least 4 governed operations, found ' + manifest.length);
const names = new Set(manifest.map((entry) => entry.name));
if (names.size !== manifest.length) throw new Error('Operation names must be unique');
const payload = { operations: manifest };
const normalized = JSON.stringify(payload, null, 2) + '\n';
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
