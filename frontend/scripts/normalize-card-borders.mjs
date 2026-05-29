#!/usr/bin/env node
// Normalize <Card> borders: strip redundant full-opacity `border-border`
// (and orphaned standalone `border`) so cards inherit the base Card's
// `border-border/60`. Scoped to <Card ...> opening tags only.
// Usage: node scripts/normalize-card-borders.mjs [--write]

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOT = 'src';

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.name.endsWith('.tsx')) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT).filter((f) => readFileSync(f, 'utf8').includes('<Card'));

// Match a <Card ...> opening tag (className strings won't contain '>').
const CARD_TAG = /<Card\b[^>]*?>/gs;

// Remove `border border-border` (orphaned pair) then standalone `border-border`,
// but never `border-border/NN` and never `hover:`/`focus:`-prefixed variants.
const tidy = (s) => s.replace(/ {2,}/g, ' ').replace(/^ | $/g, '');

function normalizeTag(tag) {
  let out = tag;
  // `border border-border` -> remove both (base already supplies the border)
  out = out.replace(/(^|[\s"'`{])border border-border(?![\w/-])/g, '$1');
  // standalone `border-border` (full opacity) -> remove; preserve /60 etc and hover:
  out = out.replace(/(^|[\s"'`{])border-border(?![\w/-])/g, '$1');
  // tidy whitespace ONLY inside class-string literals, never around JS operators
  out = out.replace(/className="([^"]*)"/g, (_, c) => `className="${tidy(c)}"`);
  out = out.replace(/className=\{`([^`]*)`\}/g, (_, c) => `className={\`${tidy(c)}\`}`);
  out = out.replace(/cn\(\s*"([^"]*)"/g, (_, c) => `cn("${tidy(c)}"`);
  // drop attributes left empty by the removal (e.g. <Card className="">)
  out = out.replace(/\s+className=""/g, '');
  return out;
}

let totalTags = 0, changedTags = 0, changedFiles = 0;
const report = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let fileChanged = false;
  const next = src.replace(CARD_TAG, (tag) => {
    totalTags++;
    // skip tags that don't carry the target token at all
    if (!/border-border(?![\w/])/.test(tag)) return tag;
    // skip if the only matches are /60-style or hover/focus prefixed
    const normalized = normalizeTag(tag);
    if (normalized !== tag) {
      changedTags++;
      fileChanged = true;
      report.push(`${file}\n   - ${tag.trim()}\n   + ${normalized.trim()}`);
    }
    return normalized;
  });
  if (fileChanged) {
    changedFiles++;
    if (WRITE) writeFileSync(file, next);
  }
}

console.log(report.join('\n'));
console.log(`\n${WRITE ? 'WROTE' : 'DRY-RUN'}: ${changedTags} Card tags changed across ${changedFiles} files (scanned ${totalTags} Card tags in ${files.length} files).`);
