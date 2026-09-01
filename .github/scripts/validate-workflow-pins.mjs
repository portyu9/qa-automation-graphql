import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.github/workflows');
const files = fs.readdirSync(root).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
let checked = 0;
for (const file of files) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (!match) continue;
    checked += 1;
    const value = match[1];
    if (value.startsWith('./') || value.startsWith('docker://')) continue;
    const at = value.lastIndexOf('@');
    const ref = at >= 0 ? value.slice(at + 1) : '';
    if (!/^[a-f0-9]{40}$/.test(ref)) throw new Error(`${file}:${index + 1} action dependency must be pinned to a 40-character commit SHA: ${value}`);
  }
}
if (checked < 8) throw new Error(`Expected a substantive workflow dependency set, checked only ${checked}`);
console.log(`Validated ${checked} immutable workflow dependencies across ${files.length} workflows.`);
