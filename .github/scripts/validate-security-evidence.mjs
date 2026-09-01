import fs from 'node:fs';

const [kind, file] = process.argv.slice(2);
if (!kind || !file) throw new Error('Usage: validate-security-evidence.mjs <npm-audit|trivy> <file>');
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
if (kind === 'npm-audit') {
  const metadata = report.metadata;
  if (!metadata?.dependencies || typeof metadata.dependencies.total !== 'number' || metadata.dependencies.total < 5) throw new Error('npm Audit evidence does not contain a substantive dependency graph');
  const vulnerabilities = metadata.vulnerabilities ?? {};
  if ((vulnerabilities.high ?? 0) > 0 || (vulnerabilities.critical ?? 0) > 0) throw new Error('npm Audit evidence contains HIGH/CRITICAL vulnerabilities');
  console.log(`Validated npm Audit graph with ${metadata.dependencies.total} dependencies.`);
} else if (kind === 'trivy') {
  if (!Array.isArray(report.Results) || report.Results.length === 0) throw new Error('Trivy evidence is structurally empty');
  const npmResults = report.Results.filter((result) => result.Type === 'npm' && typeof result.Target === 'string' && result.Target.endsWith('package-lock.json'));
  if (npmResults.length === 0) throw new Error('Trivy evidence lacks npm package-lock attribution');
  const npmPackages = npmResults.flatMap((result) => result.Packages ?? []).filter((pkg) => typeof pkg.Name === 'string' && pkg.Name.length > 0 && typeof pkg.Version === 'string' && pkg.Version.length > 0);
  if (npmPackages.length < 5) throw new Error('Trivy evidence lacks substantive npm package attribution');
  const findings = report.Results.flatMap((result) => [...(result.Vulnerabilities ?? []), ...(result.Misconfigurations ?? []), ...(result.Secrets ?? [])]);
  const gated = findings.filter((finding) => ['HIGH', 'CRITICAL'].includes(finding.Severity ?? 'HIGH'));
  if (gated.length) throw new Error(`Trivy evidence contains ${gated.length} gated findings`);
  console.log(`Validated Trivy attribution for ${npmPackages.length} npm packages with zero gated findings.`);
} else {
  throw new Error(`Unknown security evidence kind: ${kind}`);
}
