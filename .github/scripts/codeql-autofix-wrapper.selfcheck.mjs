import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { selectOpenCodeqlTargets } from './codeql-alert-preflight.mjs';

const config = JSON.parse(fs.readFileSync('.github/codeql-autofix.json', 'utf8'));
const governance = JSON.parse(fs.readFileSync('.github/dependency-governance.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/codeql-autofix.yml', 'utf8');
const controllerSha = '9280e1cf79bea79c027eabc8abe355ad89e6c010';
const sorted = (values) => [...values].sort();

test('caller targets only the requested alerts with bounded scope', () => {
  assert.deepEqual(config.targetAlertNumbers, [1, 2]);
  assert.equal(config.maxAlertsPerRun, 2);
  assert.equal(config.maxChangedFiles, 4);
  assert.equal(config.maxChangedLines, 200);
  assert.equal(config.defaultBranch, 'main');
  assert.equal(config.toolName, 'CodeQL');
});

test('qualification workflows exactly mirror dependency governance', () => {
  assert.deepEqual(sorted(config.qualificationWorkflows), sorted(governance.requiredWorkflows.map((item) => item.file)));
});

test('autofix cannot directly change workflow, dependency, or policy files', () => {
  for (const denied of ['.github/workflows/', '.github/dependabot.yml', '.github/dependency-governance.json', '.github/dependency-recovery.json', '.github/codeql-autofix.json', 'package.json', 'package-lock.json', 'Dockerfile', '.github/scripts/codeql-alert-preflight.mjs']) assert.ok(config.deniedPaths.includes(denied), `${denied} must stay denied`);
});

test('wrapper pins canonical controller and every external action immutably', () => {
  assert.match(workflow, /repository: portyu9\/qa-automation-mobile-appium/u);
  assert.equal((workflow.match(new RegExp(`ref: ${controllerSha}`, 'g')) || []).length, 2);
  for (const match of workflow.matchAll(/uses:\s+([^\s#]+)/g)) assert.match(match[1], /@[0-9a-f]{40}$/u);
});

test('privileged proposal job cannot run for pull requests', () => {
  assert.match(workflow, /propose-fixes:[\s\S]*github\.event_name == 'schedule'/u);
  assert.doesNotMatch(workflow, /propose-fixes:[\s\S]*github\.event_name == 'pull_request'/u);
  for (const permission of ['actions: write', 'contents: write', 'pull-requests: write', 'security-events: write']) assert.match(workflow, new RegExp(permission));
});

test('privileged execution is trusted-default-branch only', () => {
  assert.match(workflow, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(workflow, /\.codeql-autofix-controller\/\.github\/scripts\/codeql-autofix-policy\.mjs/u);
});

test('autofix control plane requires manual review', () => {
  for (const protectedPath of ['.github/codeql-autofix.json', '.github/workflows/codeql-autofix.yml', '.github/scripts/codeql-autofix-wrapper.selfcheck.mjs', '.github/scripts/codeql-alert-preflight.mjs']) assert.ok(governance.manualReviewPaths.includes(protectedPath), `${protectedPath} must require manual review`);
});

test('no open CodeQL alerts is a verified no-op, not a missing-ID error', () => {
  assert.deepEqual(selectOpenCodeqlTargets([], config), { state: 'empty', targets: [] });
});

test('live CodeQL targets are intersected with the reviewed target allowlist', () => {
  const open = [{ number: 2, state: 'open', tool: { name: 'CodeQL' } }];
  assert.deepEqual(selectOpenCodeqlTargets(open, config), { state: 'targets', targets: [2] });
  assert.deepEqual(selectOpenCodeqlTargets([...open, { number: 1, state: 'open', tool: { name: 'CodeQL' } }], config).targets, [1, 2]);
});

test('invalid, ambiguous, or non-authorized inventories fail closed', () => {
  const entry = (number) => ({ number, state: 'open', tool: { name: 'CodeQL' } });
  for (const inventory of [
    null, {}, [entry(3)], [entry(1), entry(3)], [entry(1), entry(1)],
    [{ number: 1, state: 'closed', tool: { name: 'CodeQL' } }],
    [{ number: 1, state: 'open', tool: { name: 'Other' } }],
    Array.from({ length: 100 }, (_, i) => entry(i + 1)),
  ]) assert.throws(() => selectOpenCodeqlTargets(inventory, config));
});

test('trusted workflow reads authenticated current open alerts and never masks HTTP failures', () => {
  assert.match(workflow, /codeScanning\.listAlertsForRepo/u);
  assert.match(workflow, /state: 'open'/u);
  assert.match(workflow, /per_page: 100/u);
  assert.match(workflow, /selectOpenCodeqlTargets\(response\.data, config\)/u);
  assert.match(workflow, /decision\.state === 'empty'/u);
  assert.match(workflow, /await runCodeqlAutofix\(\{ github, context, core, configPath \}\)/u);
  assert.doesNotMatch(workflow, /catch\s*\([^)]+\)\s*\{[\s\S]*?decision\.state === 'empty'/u);
});
