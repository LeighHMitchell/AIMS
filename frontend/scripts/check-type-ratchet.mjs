// Type-error ratchet (plan 001). Fails CI when the TS error count grows past
// the checked-in baseline. Always bypasses the incremental cache — a stale
// tsconfig.tsbuildinfo is exactly what masked the original 1,530-error backlog.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { maxErrors } = JSON.parse(readFileSync(new URL('../type-error-baseline.json', import.meta.url), 'utf8'));

let output = '';
try {
  output = execSync('npx tsc --noEmit --incremental false', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
}
const count = (output.match(/error TS\d+/g) ?? []).length;

if (count > maxErrors) {
  console.error(`Type-error ratchet FAILED: ${count} errors > baseline ${maxErrors}.`);
  console.error('New type errors were introduced. Fix them (do not raise the baseline).');
  const lines = output.split('\n').filter(l => /error TS\d+/.test(l));
  console.error(lines.slice(0, 40).join('\n'));
  process.exit(1);
}
if (count < maxErrors) {
  console.log(`Type-error ratchet OK: ${count} errors (baseline ${maxErrors}). Nice — lower maxErrors to ${count} in frontend/type-error-baseline.json in this PR.`);
} else {
  console.log(`Type-error ratchet OK: ${count} errors (== baseline).`);
}
