import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const IMG_DIR = new URL('../public/images/', import.meta.url).pathname;
const MAX_WIDTH = 800;
const QUALITY = 82;

const files = (await readdir(IMG_DIR)).filter(f => f.startsWith('empty-') && f.endsWith('.png'));
files.sort();

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const src = join(IMG_DIR, file);
  const dst = src.replace(/\.png$/, '.webp');
  const before = (await stat(src)).size;

  const img = sharp(src);
  const { width } = await img.metadata();
  const pipeline = width && width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;
  await pipeline.webp({ quality: QUALITY }).toFile(dst);

  const after = (await stat(dst)).size;
  totalBefore += before;
  totalAfter += after;
  const kb = n => (n / 1024).toFixed(0).padStart(5) + 'K';
  const pct = ((1 - after / before) * 100).toFixed(0).padStart(3);
  console.log(`${kb(before)} -> ${kb(after)}  (-${pct}%)  ${file.replace('.png', '.webp')}`);
}

const mb = n => (n / 1024 / 1024).toFixed(2);
console.log(`\nTotal: ${mb(totalBefore)}MB -> ${mb(totalAfter)}MB  (${files.length} files, -${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`);
