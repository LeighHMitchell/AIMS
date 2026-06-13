// Fails CI if a mutating API route lacks an auth-helper reference and is not allowlisted.
// Auth helpers recognised:
//   requireAuth, requireSuperUser, verifyCronSecret, auth.getUser  (direct)
//   loadForRead, loadForWrite  (program-logic wrappers that call requireAuth internally)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ALLOWLIST = new Set([
  './auth/login/route.ts', './auth/login-local/route.ts', './auth/logout/route.ts',
  './auth/register/route.ts', './waitlist/route.ts',
]);
const sh = (args) => execFileSync('grep', args, { cwd: 'src/app/api', encoding: 'utf8' }).trim();
const mutating = sh(['-lrE', 'export (async )?function (POST|PUT|PATCH|DELETE)', '--include=route.ts', '.']).split('\n');
const offenders = mutating.filter(f => {
  if (ALLOWLIST.has(f)) return false;
  const src = readFileSync(`src/app/api/${f.slice(2)}`, 'utf8');
  return !/requireAuth|requireSuperUser|verifyCronSecret|auth\.getUser|loadForRead|loadForWrite/.test(src);
});
if (offenders.length) {
  console.error('Mutating routes without auth (add requireAuth or allowlist in docs/public-api-routes.md + this script):');
  offenders.forEach(f => console.error('  ' + f));
  process.exit(1);
}
console.log(`route-auth check OK (${mutating.length} mutating routes scanned)`);
