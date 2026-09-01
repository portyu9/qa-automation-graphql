import fs from 'node:fs';

const [junitPath, coveragePath] = process.argv.slice(2);
if (!junitPath || !coveragePath) throw new Error('Usage: validate-test-evidence.mjs <junit> <coverage-summary>');
const junit = fs.readFileSync(junitPath, 'utf8');
const testcases = (junit.match(/<testcase\b/g) ?? []).length;
if (testcases !== 23) throw new Error(`Expected exactly 23 governed deterministic test executions, found ${testcases}`);
if (/<failure\b|<error\b|<skipped\b/.test(junit)) throw new Error('JUnit evidence contains failed, errored, or skipped executions');
for (const suite of [
  'tests/unit/client.test.ts',
  'tests/unit/config.test.ts',
  'tests/unit/manifest.test.ts',
  'tests/unit/policy.test.ts',
  'tests/contract/schema.test.ts',
  'tests/integration/execution.test.ts',
  'tests/integration/http.test.ts'
]) {
  if (!junit.includes(suite)) throw new Error(`JUnit evidence is missing governed suite identity: ${suite}`);
}
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const total = coverage.total;
for (const [metric, floor] of Object.entries({ lines: 80, statements: 80, functions: 75, branches: 70 })) {
  if (!total?.[metric] || total[metric].pct < floor) throw new Error(`Coverage ${metric} ${total?.[metric]?.pct ?? 'missing'} is below ${floor}`);
}
console.log(`Validated ${testcases} exact governed executions across 7 suites and governed coverage floors.`);
