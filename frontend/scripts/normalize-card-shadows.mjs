#!/usr/bin/env node
// Normalize <Card> shadows:
//  1) HOVER: convert hover:shadow-md / hover:shadow-lg -> the house custom 2-layer
//     lift (already used by DashboardHeroCards). DocumentCard's hover:shadow-xl is
//     left untouched (intentional distinctive component).
//  2) RESTING: remove stray `shadow-sm` from a small named set so they inherit the
//     base Card shadow.
// Scoped to <Card ...> opening tags only.
// Usage: node scripts/normalize-card-shadows.mjs [--write]

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOT = 'src';
const LIFT = 'hover:shadow-card-hover';
// The inline custom lift previously used by DashboardHeroCards -> token.
const INLINE_LIFT = /hover:shadow-\[0_2px_4px_rgba\(0,0,0,0\.06\),0_4px_12px_rgba\(0,0,0,0\.06\)\]/g;

// Files where a resting `shadow-sm` override should be removed.
const RESTING_SM_FILES = new Set([
  'src/components/ActivityCompletion.tsx',
  'src/components/ActivityCompletionEnhanced.tsx',
  'src/components/activities/EnhancedActivityEditor.tsx',
  'src/app/policy-markers/[id]/page.tsx',
  'src/app/build-history/page.tsx',
].map((p) => p.replace(/\//g, '/')));

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.name.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

const CARD_TAG = /<Card\b[^>]*?>/gs;
// Only tidy single-line class content; never touch multiline strings (would
// destroy the indentation of continuation lines).
const tidy = (s) => (s.includes('\n') ? s : s.replace(/ {2,}/g, ' ').replace(/^ | $/g, ''));

function cleanClassStrings(out) {
  // Resting shadow-sm removals only occur in single-line className="..." strings;
  // tidy those and drop any now-empty className. Leave multiline strings untouched.
  out = out.replace(/className="([^"\n]*)"/g, (_, c) => `className="${tidy(c)}"`);
  out = out.replace(/\s+className=""/g, '');
  return out;
}

const files = walk(ROOT).filter((f) => readFileSync(f, 'utf8').includes('<Card'));
let hoverChanges = 0, restingChanges = 0, changedFiles = 0;
const report = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const allowResting = RESTING_SM_FILES.has(file);
  let fileChanged = false;
  const next = src.replace(CARD_TAG, (tag) => {
    let out = tag;
    let afterHover = out.replace(/hover:shadow-(md|lg)\b/g, LIFT).replace(INLINE_LIFT, LIFT);
    if (afterHover !== out) { hoverChanges++; out = afterHover; }
    if (allowResting) {
      const afterRest = out.replace(/(^|[\s"'`{])shadow-sm(?![\w-])/g, '$1');
      if (afterRest !== out) { restingChanges++; out = afterRest; }
    }
    if (out !== tag) {
      out = cleanClassStrings(out);
      fileChanged = true;
      report.push(`${file}\n   - ${tag.trim()}\n   + ${out.trim()}`);
    }
    return out;
  });
  if (fileChanged) {
    changedFiles++;
    if (WRITE) writeFileSync(file, next);
  }
}

console.log(report.join('\n\n'));
console.log(`\n${WRITE ? 'WROTE' : 'DRY-RUN'}: ${hoverChanges} hover + ${restingChanges} resting shadow changes across ${changedFiles} files.`);
