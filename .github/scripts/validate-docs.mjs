import fs from 'node:fs';

const readme = fs.readFileSync('README.md', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const required = [
  '# GraphQL Quality Engineering Framework',
  '## Quality model',
  '## Architecture',
  '## Toolchain',
  '## Schema governance',
  '## Operation governance',
  '## CI conclusions',
  '## Repository map',
  '`CI / ci-gate`',
  '`Security / security-gate`',
];

for (const fragment of required) {
  if (!readme.includes(fragment)) throw new Error(`README missing required contract: ${fragment}`);
}

if (/portfolio/i.test(readme)) throw new Error('README must remain neutral technical documentation');

const technologyBadges = ['GraphQL.js', 'TypeScript', 'Vitest', 'Node.js'];
for (const label of technologyBadges) {
  if (!readme.includes(`![${label}]`)) {
    throw new Error(`README technology badge is missing: ${label}`);
  }
}

for (const workflow of ['ci.yml', 'security.yml', 'docs.yml']) {
  const badge = `actions/workflows/${workflow}/badge.svg`;
  if (!readme.includes(badge)) throw new Error(`README workflow badge is missing: ${workflow}`);
}

if (readme.includes('![Live Smoke]') || readme.includes('Live%20Smoke-manual')) {
  throw new Error('README must not include a live-smoke badge; the externally configured workflow is documented in prose instead');
}

const manifestBackedToolchain = [
  ['GraphQL.js', packageJson.dependencies?.graphql, (version) => `| GraphQL.js | ${version} |`],
  ['TypeScript', packageJson.devDependencies?.typescript, (version) => `| TypeScript | ${version} `],
  ['Vitest', packageJson.devDependencies?.vitest, (version) => `| Vitest | ${version} |`],
  [
    'Coverage',
    packageJson.devDependencies?.['@vitest/coverage-v8'],
    (version) => `| Coverage | V8 through \`@vitest/coverage-v8\` ${version} |`,
  ],
];

for (const [label, version, expectedFragment] of manifestBackedToolchain) {
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(`package.json is missing the dependency version required by README Toolchain: ${label}`);
  }
  if (!readme.includes(expectedFragment(version))) {
    throw new Error(`README Toolchain ${label} version does not match package.json: expected ${version}`);
  }
}

const mermaid = readme.match(/```mermaid\s*\n([\s\S]*?)```/u)?.[1];
if (!mermaid || !/^flowchart\s+/mu.test(mermaid)) {
  throw new Error('README must include a Mermaid flowchart architecture diagram');
}
if (!mermaid.includes('classDef') || !mermaid.includes('linkStyle')) {
  throw new Error('README Mermaid architecture must retain polished class and link styling');
}

const map = readme.match(/## Repository map[\s\S]*?```text\n([\s\S]*?)```/u)?.[1];
if (!map) throw new Error('README repository map is missing');

for (const line of map.split(/\r?\n/u)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '.') continue;
  const entry = trimmed.replace(/^[│├└─\s]+/u, '');
  if (!entry.endsWith('/')) throw new Error(`Repository map must contain directories only: ${entry}`);
}

for (const topLevelDirectory of ['.github/', 'docs/', 'operations/', 'schema/', 'scripts/', 'src/', 'tests/']) {
  const path = topLevelDirectory.slice(0, -1);
  if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) {
    throw new Error(`Repository map directory does not exist: ${topLevelDirectory}`);
  }
}

for (const doc of [
  'architecture.md',
  'graphql-testing.md',
  'security-and-limits.md',
  'schema-evolution.md',
  'live-endpoint.md',
  'ci-quality-gates.md',
]) {
  const file = `docs/${doc}`;
  if (!fs.existsSync(file) || fs.statSync(file).size < 200) {
    throw new Error(`Documentation is missing or trivial: ${file}`);
  }
}

console.log(
  'Documentation contract validated: required sections, manifest-backed Toolchain versions, versionless technology badges, workflow badges, styled Mermaid architecture, documentation references, and directory-only repository map are consistent.',
);
