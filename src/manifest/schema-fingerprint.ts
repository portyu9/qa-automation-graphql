import { createHash } from 'node:crypto';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { schema } from '../schema/schema.js';

export function normalizedSchema(): string {
  return `${printSchema(lexicographicSortSchema(schema)).trim()}\n`;
}

export function schemaFingerprint(): string {
  return createHash('sha256').update(normalizedSchema()).digest('hex');
}
