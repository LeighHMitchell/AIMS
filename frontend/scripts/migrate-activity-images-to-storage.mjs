// Migrate base64 activity banner/icon into Supabase Storage and replace the DB
// column with a public URL. Mirrors migrate-org-images-to-storage.mjs.
//
//   Dry run (default):  node scripts/migrate-activity-images-to-storage.mjs
//   Apply for real:     node scripts/migrate-activity-images-to-storage.mjs --apply
//
// Idempotent: rows whose value already starts with http are skipped.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const BUCKET = 'uploads';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
};
const fmt = (n) => (n / 1024).toFixed(1) + ' KB';

function parseDataUri(v) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(v || '');
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

async function migrateField(row, field) {
  const value = row[field];
  if (!value || !value.startsWith('data:')) return null;
  const parsed = parseDataUri(value);
  if (!parsed) {
    console.warn(`  ! ${row.id} ${field}: unrecognised data URI, skipping`);
    return null;
  }
  const ext = EXT[parsed.mime] || 'png';
  const path = `activities/${row.id}/${field}-${randomUUID()}.${ext}`;

  if (!APPLY) {
    console.log(`  [dry] ${row.id} ${field}: ${fmt(value.length)} base64 -> ${path}`);
    return { field };
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, parsed.buffer, { contentType: parsed.mime, cacheControl: '3600', upsert: false });
  if (upErr) {
    console.error(`  ! ${row.id} ${field}: upload failed — ${upErr.message}`);
    return null;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  console.log(`  ✓ ${row.id} ${field}: ${fmt(value.length)} -> ${pub.publicUrl}`);
  return { field, url: pub.publicUrl };
}

const { data: rows, error } = await supabase
  .from('activities')
  .select('id, banner, icon')
  .or('banner.like.data:%,icon.like.data:%');
if (error) { console.error('Query failed:', error.message); process.exit(1); }

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — ${rows.length} activities with base64 images\n`);

let migrated = 0, rowsUpdated = 0;
for (const row of rows) {
  const bannerRes = await migrateField(row, 'banner');
  const iconRes = await migrateField(row, 'icon');
  if (!bannerRes && !iconRes) continue;
  migrated += (bannerRes ? 1 : 0) + (iconRes ? 1 : 0);

  if (APPLY) {
    const patch = {};
    if (bannerRes?.url) patch.banner = bannerRes.url;
    if (iconRes?.url) patch.icon = iconRes.url;
    if (Object.keys(patch).length) {
      const { error: updErr } = await supabase.from('activities').update(patch).eq('id', row.id);
      if (updErr) console.error(`  ! ${row.id}: DB update failed — ${updErr.message}`);
      else rowsUpdated++;
    }
  }
}

console.log(`\n${APPLY ? 'Done' : 'Would migrate'}: ${migrated} images across ${rows.length} activities.`);
if (APPLY) console.log(`DB rows updated: ${rowsUpdated}`);
if (!APPLY) console.log('Re-run with --apply to perform the migration.\n');
