import { describe, expect, it } from 'vitest';
import { buildOperationManifest } from '../../src/manifest/operations.js';
import { schemaFingerprint } from '../../src/manifest/schema-fingerprint.js';

describe('governed operation manifest', () => {
  it('binds each committed operation to a stable SHA-256 identity', () => {
    const manifest = buildOperationManifest();
    expect(manifest.map((entry) => entry.name)).toEqual(['Search', 'UpdateUserRole', 'Users', 'Viewer']);
    for (const entry of manifest) expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces a deterministic schema fingerprint', () => {
    expect(schemaFingerprint()).toMatch(/^[a-f0-9]{64}$/);
    expect(schemaFingerprint()).toBe(schemaFingerprint());
  });
});
