/**
 * Probe: check if transactions.is_humanitarian is nullable.
 * Read-only: does not write to the database.
 * Run: node scripts/probe-is-humanitarian-nullability.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

// Load .env.local manually (no dotenv dep needed)
const envText = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  envVars[key] = val;
}

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !serviceKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const supabase = createClient(url, serviceKey);

// Probe: is there any row with is_humanitarian = null?
const { data, error } = await supabase
  .from('transactions')
  .select('uuid')
  .is('is_humanitarian', null)
  .limit(1);

if (error) {
  console.error('Query error:', error.message);
  process.exit(2);
}

if (data && data.length > 0) {
  console.log('CONCLUSION: NULLABLE — found row with is_humanitarian IS NULL:', data[0].uuid);
} else {
  console.log('CONCLUSION: No NULL rows found — column may be NOT NULL or simply all rows have a value.');
  console.log('Falling back to DDL grep...');
}
