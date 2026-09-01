import fs from 'node:fs';
import path from 'node:path';

const forbidden = [/\bTODO\b/i, /\bFIXME\b/i, /\.only\s*\(/, /test\.skip\s*\(/];
const extensions = new Set(['.ts', '.mjs', '.json', '.md', '.yml', '.yaml', '.graphql']);
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'coverage', 'reports', '.git'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk('.')) {
  if (!extensions.has(path.extname(file))) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(text)) throw new Error(`Forbidden unfinished/focused-test marker ${pattern} in ${file}`);
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Dependency ${name} must use an exact version, got ${version}`);
}
console.log('Repository policy validated.');
