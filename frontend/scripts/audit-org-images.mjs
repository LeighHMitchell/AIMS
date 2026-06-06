// One-off diagnostic: measures how much of the organizations payload is
// image data, and whether logos/banners are base64 data URIs or storage URLs.
// Run from frontend/:  node scripts/audit-org-images.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Load env from .env.local
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase
  .from('organizations')
  .select('id, name, logo, banner');

if (error) {
  console.error('Query failed:', error.message);
  process.exit(1);
}

const kind = (v) => {
  if (!v) return 'empty';
  if (v.startsWith('data:')) return 'base64';
  if (v.startsWith('http')) return 'url';
  return 'other';
};
const bytes = (v) => (v ? Buffer.byteLength(v, 'utf8') : 0);
const fmt = (n) => (n / 1024).toFixed(1) + ' KB';

const tally = { logo: {}, banner: {} };
let logoBytes = 0, bannerBytes = 0, base64LogoBytes = 0, base64BannerBytes = 0;
let maxLogo = 0, maxBanner = 0, biggestOrg = null;

for (const o of data) {
  const lk = kind(o.logo), bk = kind(o.banner);
  tally.logo[lk] = (tally.logo[lk] || 0) + 1;
  tally.banner[bk] = (tally.banner[bk] || 0) + 1;
  const lb = bytes(o.logo), bb = bytes(o.banner);
  logoBytes += lb; bannerBytes += bb;
  if (lk === 'base64') base64LogoBytes += lb;
  if (bk === 'base64') base64BannerBytes += bb;
  if (lb > maxLogo) maxLogo = lb;
  if (bb > maxBanner) maxBanner = bb;
  if (lb + bb > 0 && (!biggestOrg || lb + bb > biggestOrg.size)) {
    biggestOrg = { name: o.name, size: lb + bb };
  }
}

// Approximate full list payload (all columns) by re-fetching the slim list shape
const totalImageBytes = logoBytes + bannerBytes;

console.log(`\nOrganizations: ${data.length}\n`);
console.log('logo column:  ', tally.logo);
console.log('banner column:', tally.banner);
console.log('');
console.log(`logo bytes total:    ${fmt(logoBytes)}  (base64: ${fmt(base64LogoBytes)})  max single: ${fmt(maxLogo)}`);
console.log(`banner bytes total:  ${fmt(bannerBytes)}  (base64: ${fmt(base64BannerBytes)})  max single: ${fmt(maxBanner)}`);
console.log(`\n>>> image bytes in a full org-list payload: ${fmt(totalImageBytes)} (${(totalImageBytes / 1024 / 1024).toFixed(2)} MB)`);
if (biggestOrg) console.log(`>>> heaviest org: "${biggestOrg.name}" at ${fmt(biggestOrg.size)}`);
console.log('');
