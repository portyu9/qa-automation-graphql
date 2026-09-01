import fs from 'node:fs';

const readme = fs.readFileSync('README.md', 'utf8');
const required = ['## Quality model', '## Toolchain', '## CI conclusions', '## Repository map', 'GraphQL.js 17.0.2', 'TypeScript 7.0.2', 'Vitest 4.1.11'];
for (const fragment of required) if (!readme.includes(fragment)) throw new Error(`README missing required contract: ${fragment}`);
const map = readme.match(/## Repository map[\s\S]*?```text\n([\s\S]*?)```/);
if (!map) throw new Error('README repository map is missing');
for (const line of map[1].trim().split(/\r?\n/)) {
  if (!line.endsWith('/')) throw new Error(`Repository map must contain directories only: ${line}`);
  if (!fs.statSync(line).isDirectory()) throw new Error(`Repository map directory does not exist: ${line}`);
}
for (const doc of ['architecture.md', 'graphql-testing.md', 'security-and-limits.md', 'schema-evolution.md', 'live-endpoint.md', 'ci-quality-gates.md']) {
  const file = `docs/${doc}`;
  if (!fs.existsSync(file) || fs.statSync(file).size < 200) throw new Error(`Documentation is missing or trivial: ${file}`);
}
console.log('Documentation contract validated.');
