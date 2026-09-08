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
const exactVersion = /^(\d+)\.(\d+)\.(\d+)$/u;
const failures = [];
const fail = (message) => failures.push(message);
const lockRoot = packageLock.packages?.[''] ?? {};
const primaryNodeTypes = String(packageJson.devDependencies?.['@types/node'] ?? '');
const primaryNodeTypesMatch = exactVersion.exec(primaryNodeTypes);
const lockedNodeTypes = packageLock.packages?.['node_modules/@types/node']?.version;

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
if (!primaryNodeTypesMatch || Number(primaryNodeTypesMatch[1]) !== 24) {
  fail('package.json @types/node must pin an exact Node 24 declaration release for the primary runtime');
}
if (lockRoot.devDependencies?.['@types/node'] !== primaryNodeTypes) {
  fail('package-lock.json root @types/node declaration must match package.json exactly');
}
if (lockedNodeTypes !== primaryNodeTypes) {
  fail(`package-lock.json installed @types/node must equal the primary declaration pin ${primaryNodeTypes}`);
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

const node22TypesMatch = /^\s*NODE22_TYPES_VERSION:\s*(\d+\.\d+\.\d+)\s*$/mu.exec(ci);
if (!node22TypesMatch || Number(exactVersion.exec(node22TypesMatch[1])?.[1]) !== 22) {
  fail('ci.yml must pin NODE22_TYPES_VERSION to an exact Node 22 declaration release');
}
if (!ci.includes('npm install --no-save --ignore-scripts --package-lock=false "@types/node@${NODE22_TYPES_VERSION}"')) {
  fail('ci.yml Node 22 compatibility lane must install governed Node 22 declarations without mutating the lockfile');
}
if (!ci.includes('[[ "$(node -p "require(\'./node_modules/@types/node/package.json\').version")" == "$NODE22_TYPES_VERSION" ]]')) {
  fail('ci.yml Node 22 compatibility lane must verify the installed declaration version');
}

const npmInstallToken = 'npm install --global --ignore-scripts "npm@${NPM_VERSION}"';
const npmVerifyToken = '[[ "$(npm --version)" == "$NPM_VERSION" ]]';
const ciNpmInstalls = ci.split(npmInstallToken).length - 1;
const ciNpmVerifications = ci.split(npmVerifyToken).length - 1;
if (ciNpmInstalls !== 2 || ciNpmVerifications !== 2) {
  fail(`ci.yml must install and verify exact npm in both Node 24 and Node 22 lanes; installs=${ciNpmInstalls}, verifies=${ciNpmVerifications}`);
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

for (const name of ['security.yml', 'live-smoke.yml']) {
  const workflow = workflows[name];
  if (!workflow.includes(npmInstallToken) || !workflow.includes(npmVerifyToken)) {
    fail(`${name} must install and verify the governed npm runtime before npm-dependent execution`);
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

console.log(
  `Runtime policy validated: primary=${nvmrc}, qualified=Node22+Node24, npm=${expectedNpm}, primary-types=${primaryNodeTypes}, node22-types=${node22TypesMatch?.[1]}, lock=aligned.`,
);
