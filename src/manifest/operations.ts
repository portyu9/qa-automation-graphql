import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Kind, parse, print, type OperationDefinitionNode } from 'graphql';

export interface OperationManifestEntry {
  name: string;
  type: string;
  path: string;
  sha256: string;
}

function collectGraphqlFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectGraphqlFiles(path);
    return entry.isFile() && entry.name.endsWith('.graphql') ? [path] : [];
  });
}

export function buildOperationManifest(root = join(process.cwd(), 'operations')): OperationManifestEntry[] {
  return collectGraphqlFiles(root).map((file) => {
    const document = parse(readFileSync(file, 'utf8'));
    const operations = document.definitions.filter((definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION);
    if (operations.length !== 1 || !operations[0]?.name) throw new Error(`${relative(root, file)} must contain exactly one named operation`);
    const normalized = print(document);
    return {
      name: operations[0].name.value,
      type: operations[0].operation,
      path: relative(root, file).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(normalized).digest('hex')
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
}
