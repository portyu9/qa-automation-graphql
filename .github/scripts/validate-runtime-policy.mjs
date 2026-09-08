import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const nvmrc = fs.readFileSync('.nvmrc', 'utf8').trim();
const workflowNames = ['ci.yml', 'security.yml', 'docs.yml', 'live-smoke.yml'];
const workflows = Object.fromEntries(
  workflowNames.map((name) => [name, fs.readFileSync(`.github/workflows/${name}`, 'utf8')]),
);

const expectedNode = '>=22.0.0 <23.0.0 || >=24.0.0 <25.0.0';
const expectedNpm = '11.19.1';
const failures = [];
const fail = (message) => failures.push(message);
const lockRoot = packageLock.packages?.[''] ?? {};

if (packageJson.engines?.node !== expectedNode) {
  fail(`package.json engines.node must expose only qualified Node 22 and Node 24 lines: ${expectedNode}`);
}
if (packageJson.engines?.npm !== expectedNpm) {
  fail(`package.json engines.npm must pin ${expectedNpm}`);
}
if (lockRoot.engines?.node !== packageJson.engines?.node) {
  fail('package-lock.json root Node engine must match package.json exactly');
}
if (lockRoot.engines?.npm !== packageJson.engines?.npm) {
  fail('package-lock.json root npm engine must match package.json exactly');
}
if (!/^24\.\d+\.\d+$/u.test(nvmrc)) {
  fail('.nvmrc must pin an exact Node 24 primary runtime');
}

const ci = workflows['ci.yml'];
if (!ci.includes(`NPM_VERSION: ${expectedNpm}`)) {
  fail(`ci.yml must bind NPM_VERSION to package.json engines.npm (${expectedNpm})`);
}
if (!ci.includes('node-version-file: .nvmrc')) {
  fail('ci.yml primary quality job must use .nvmrc');
}
if (!/node-version:\s*22\s*$/mu.test(ci)) {
  fail('ci.yml must retain explicit Node 22 compatibility qualification');
}
if (/node-version:\s*23(?:\D|$)/mu.test(ci)) {
  fail('ci.yml must not qualify unsupported Node 23');
}

for (const name of ['security.yml', 'docs.yml', 'live-smoke.yml']) {
  const workflow = workflows[name];
  const setupCount = [...workflow.matchAll(/uses: actions\/setup-node@/gu)].length;
  const nvmCount = [...workflow.matchAll(/node-version-file:\s*\.nvmrc/gu)].length;
  if (setupCount !== nvmCount) {
    fail(`${name} must route every setup-node invocation through .nvmrc; setup=${setupCount}, nvmrc=${nvmCount}`);
  }
}

for (const name of ['ci.yml', 'security.yml', 'live-smoke.yml']) {
  if (!workflows[name].includes(`NPM_VERSION: ${expectedNpm}`)) {
    fail(`${name} must bind NPM_VERSION to package.json engines.npm (${expectedNpm})`);
  }
}

if (packageJson.scripts?.['runtime-policy:check'] !== 'node .github/scripts/validate-runtime-policy.mjs') {
  fail('package.json must expose runtime-policy:check');
}
if (!String(packageJson.scripts?.quality ?? '').includes('npm run runtime-policy:check')) {
  fail('package.json quality must execute runtime-policy:check');
}

if (failures.length > 0) {
  console.error('Runtime policy contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Runtime policy validated: primary=${nvmrc}, qualified=Node22+Node24, npm=${expectedNpm}, lock=aligned.`);
