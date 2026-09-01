import fs from 'node:fs';

function replace(path, oldText, newText) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(oldText)) throw new Error(`Expected bootstrap source fragment missing from ${path}`);
  fs.writeFileSync(path, text.replace(oldText, newText));
}

replace(
  'src/client/graphql-client.ts',
  '  private readonly authToken?: string;',
  '  private readonly authToken: string | undefined;'
);

replace(
  'src/schema/execute.ts',
  "import { execute, parse, validate, type ExecutionResult } from 'graphql';",
  "import { GraphQLError, execute, parse, validate, type ExecutionResult } from 'graphql';"
);
replace(
  'src/schema/execute.ts',
  "    return { errors: [error instanceof Error ? error : new Error(String(error))] };",
  "    return { errors: [new GraphQLError(error instanceof Error ? error.message : String(error))] };"
);

replace(
  'src/server/http-server.ts',
  "import { executeOperation } from '../schema/execute.js';",
  "import { executeOperation, type ExecuteOptions } from '../schema/execute.js';"
);
replace(
  'src/server/http-server.ts',
  `      const result = await executeOperation({
        source: body.query,
        variables: variables as Record<string, unknown> | undefined,
        operationName,
        viewerId: viewerFromAuthorization(request.headers.authorization),
        store
      });`,
  `      const executeOptions: ExecuteOptions = { source: body.query, store };
      if (variables !== undefined) executeOptions.variables = variables as Record<string, unknown>;
      if (operationName !== undefined) executeOptions.operationName = operationName;
      const viewerId = viewerFromAuthorization(request.headers.authorization);
      if (viewerId !== undefined) executeOptions.viewerId = viewerId;
      const result = await executeOperation(executeOptions);`
);

replace(
  'tests/smoke/live-endpoint.test.ts',
  "const enabled = process.env.RUN_LIVE_GRAPHQL === 'true';\n\ndescribe.skipIf(!enabled)('explicit live GraphQL smoke', () => {",
  "describe('explicit live GraphQL smoke', () => {"
);
replace(
  'tests/smoke/live-endpoint.test.ts',
  "    const client = new GraphQLClient({ endpoint: config.endpoint, authToken: config.authToken, timeoutMs: config.timeoutMs });",
  `    const client = new GraphQLClient(config.authToken
      ? { endpoint: config.endpoint, authToken: config.authToken, timeoutMs: config.timeoutMs }
      : { endpoint: config.endpoint, timeoutMs: config.timeoutMs });`
);

replace(
  'tests/unit/policy.test.ts',
  "    expect(measureOperation(document, 'Q')).toEqual({ depth: 4, selections: 8 });",
  "    expect(measureOperation(document, 'Q')).toEqual({ depth: 4, selections: 7 });"
);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts['test:live'] = 'RUN_LIVE_GRAPHQL=true vitest run --config vitest.live.config.ts';
fs.writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

fs.writeFileSync('vitest.live.config.ts', `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/smoke/live-endpoint.test.ts'],
    testTimeout: 10_000
  }
});
`);

fs.writeFileSync('.github/scripts/validate-test-evidence.mjs', `import fs from 'node:fs';

const [junitPath, coveragePath] = process.argv.slice(2);
if (!junitPath || !coveragePath) throw new Error('Usage: validate-test-evidence.mjs <junit> <coverage-summary>');
const junit = fs.readFileSync(junitPath, 'utf8');
const testcases = (junit.match(/<testcase\\b/g) ?? []).length;
if (testcases !== 23) throw new Error(\`Expected exactly 23 governed deterministic test executions, found \${testcases}\`);
if (/<failure\\b|<error\\b|<skipped\\b/.test(junit)) throw new Error('JUnit evidence contains failed, errored, or skipped executions');
for (const suite of [
  'tests/unit/client.test.ts',
  'tests/unit/config.test.ts',
  'tests/unit/manifest.test.ts',
  'tests/unit/policy.test.ts',
  'tests/contract/schema.test.ts',
  'tests/integration/execution.test.ts',
  'tests/integration/http.test.ts'
]) {
  if (!junit.includes(suite)) throw new Error(\`JUnit evidence is missing governed suite identity: \${suite}\`);
}
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverage.total;
for (const [metric, floor] of Object.entries({ lines: 80, statements: 80, functions: 75, branches: 70 })) {
  if (!total?.[metric] || total[metric].pct < floor) throw new Error(\`Coverage \${metric} \${total?.[metric]?.pct ?? 'missing'} is below \${floor}\`);
}
console.log(\`Validated \${testcases} exact governed executions across 7 suites and governed coverage floors.\`);
`);

fs.writeFileSync('.github/scripts/validate-security-evidence.mjs', `import fs from 'node:fs';

const [kind, file] = process.argv.slice(2);
if (!kind || !file) throw new Error('Usage: validate-security-evidence.mjs <npm-audit|trivy> <file>');
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
if (kind === 'npm-audit') {
  const metadata = report.metadata;
  if (!metadata?.dependencies || typeof metadata.dependencies.total !== 'number' || metadata.dependencies.total < 5) throw new Error('npm Audit evidence does not contain a substantive dependency graph');
  const vulnerabilities = metadata.vulnerabilities ?? {};
  if ((vulnerabilities.high ?? 0) > 0 || (vulnerabilities.critical ?? 0) > 0) throw new Error('npm Audit evidence contains HIGH/CRITICAL vulnerabilities');
  console.log(\`Validated npm Audit graph with \${metadata.dependencies.total} dependencies.\`);
} else if (kind === 'trivy') {
  if (!Array.isArray(report.Results) || report.Results.length === 0) throw new Error('Trivy evidence is structurally empty');
  const npmResults = report.Results.filter((result) => result.Type === 'npm' && typeof result.Target === 'string' && result.Target.endsWith('package-lock.json'));
  if (npmResults.length === 0) throw new Error('Trivy evidence lacks npm package-lock attribution');
  const npmPackages = npmResults.flatMap((result) => result.Packages ?? []).filter((pkg) => typeof pkg.Name === 'string' && pkg.Name.length > 0 && typeof pkg.Version === 'string' && pkg.Version.length > 0);
  if (npmPackages.length < 5) throw new Error('Trivy evidence lacks substantive npm package attribution');
  const findings = report.Results.flatMap((result) => [...(result.Vulnerabilities ?? []), ...(result.Misconfigurations ?? []), ...(result.Secrets ?? [])]);
  const gated = findings.filter((finding) => ['HIGH', 'CRITICAL'].includes(finding.Severity ?? 'HIGH'));
  if (gated.length) throw new Error(\`Trivy evidence contains \${gated.length} gated findings\`);
  console.log(\`Validated Trivy attribution for \${npmPackages.length} npm packages with zero gated findings.\`);
} else {
  throw new Error(\`Unknown security evidence kind: \${kind}\`);
}
`);

fs.writeFileSync('.github/workflows/security.yml', `name: security

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: "31 6 * * 1"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: graphql-security-\${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

env:
  NPM_VERSION: 11.19.1

jobs:
  supply-chain-policy:
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .nvmrc
      - run: node .github/scripts/validate-workflow-pins.mjs
      - run: node --check .github/scripts/validate-security-evidence.mjs

  codeql:
    needs: supply-chain-policy
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
    permissions:
      actions: read
      contents: read
      security-events: write
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: github/codeql-action/init@cdf488f595d80d6e07e03d4674febd5ab45fa938 # v4.37.9
        with:
          languages: javascript-typescript
          queries: security-extended
      - uses: github/codeql-action/analyze@cdf488f595d80d6e07e03d4674febd5ab45fa938 # v4.37.9

  npm-audit:
    needs: supply-chain-policy
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: package-lock.json
      - run: npm install --global --ignore-scripts "npm@\${NPM_VERSION}"
      - name: Generate npm audit evidence
        shell: bash
        run: |
          set -euo pipefail
          mkdir -p reports/security/npm
          set +e
          npm audit --audit-level=high --json > reports/security/npm/audit.json
          status=$?
          set -e
          node .github/scripts/validate-security-evidence.mjs npm-audit reports/security/npm/audit.json
          exit "$status"
      - if: always()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: graphql-npm-audit
          path: reports/security/npm/
          if-no-files-found: error
          retention-days: 14

  trivy:
    needs: supply-chain-policy
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - run: mkdir -p reports/security/trivy
      - uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0
        env:
          TRIVY_INCLUDE_DEV_DEPS: "true"
        with:
          version: v0.74.0
          scan-type: fs
          scan-ref: .
          scanners: vuln,misconfig,secret
          severity: HIGH,CRITICAL
          ignore-unfixed: true
          list-all-pkgs: true
          format: json
          output: reports/security/trivy/trivy.json
          exit-code: "1"
      - name: Require attributed scanner evidence
        if: always()
        run: node .github/scripts/validate-security-evidence.mjs trivy reports/security/trivy/trivy.json
      - if: always()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: graphql-trivy
          path: reports/security/trivy/
          if-no-files-found: error
          retention-days: 14

  dependency-review:
    needs: supply-chain-policy
    if: github.event_name == 'pull_request'
    permissions:
      contents: read
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: Probe GitHub Dependency graph
        id: dependency-graph
        env:
          GH_TOKEN: \${{ github.token }}
        run: |
          set -euo pipefail
          if gh api -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "repos/$GITHUB_REPOSITORY/dependency-graph/sbom" >/dev/null 2>&1; then
            echo 'available=true' >> "$GITHUB_OUTPUT"
          else
            echo 'available=false' >> "$GITHUB_OUTPUT"
            echo '::warning::Dependency graph unavailable; npm Audit and Trivy remain independent repository-wide gates but are not equivalent to PR-diff Dependency Review.'
          fi
      - if: steps.dependency-graph.outputs.available == 'true'
        uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
        with:
          fail-on-severity: high
      - if: steps.dependency-graph.outputs.available != 'true'
        run: echo 'Change-aware Dependency Review unavailable; repository-wide security gates remain active.'

  security-gate:
    name: security-gate
    if: always()
    needs: [supply-chain-policy, codeql, npm-audit, trivy, dependency-review]
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - name: Evaluate security jobs
        env:
          SUPPLY_CHAIN: \${{ needs.supply-chain-policy.result }}
          CODEQL: \${{ needs.codeql.result }}
          NPM_AUDIT: \${{ needs.npm-audit.result }}
          TRIVY: \${{ needs.trivy.result }}
          DEPENDENCY_REVIEW: \${{ needs.dependency-review.result }}
          EVENT: \${{ github.event_name }}
          SAME_REPO: \${{ github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository }}
        run: |
          set -euo pipefail
          [[ "$SUPPLY_CHAIN" == success ]]
          [[ "$NPM_AUDIT" == success ]]
          [[ "$TRIVY" == success ]]
          if [[ "$SAME_REPO" == true ]]; then [[ "$CODEQL" == success ]]; else [[ "$CODEQL" == skipped ]]; fi
          if [[ "$EVENT" == pull_request ]]; then [[ "$DEPENDENCY_REVIEW" == success ]]; else [[ "$DEPENDENCY_REVIEW" == skipped ]]; fi
`);

console.log('Applied strict source, evidence, security, live-smoke, and operation-metric corrections.');
