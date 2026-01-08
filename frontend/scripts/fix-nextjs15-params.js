#!/usr/bin/env node
/**
 * Script to fix Next.js 15 params pattern in API routes
 * Changes: { params }: { params: { id: string } }
 * To: { params }: { params: Promise<{ id: string }> }
 * And adds await params destructuring
 */

const fs = require('fs');
const path = require('path');

// Find all route.ts files in src/app/api
function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts' || item.endsWith('-backup.ts') || item.endsWith('-fallback.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Fix a single file
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already fixed
  if (content.includes('params: Promise<')) {
    console.log(`SKIP (already fixed): ${filePath}`);
    return false;
  }

  // Skip if no params pattern found
  if (!content.includes('{ params }:')) {
    console.log(`SKIP (no params): ${filePath}`);
    return false;
  }

  let modified = false;

  // Pattern 1: { params }: { params: { id: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ id: string \} \}/g,
    '{ params }: { params: Promise<{ id: string }> }'
  );

  // Pattern 2: { params }: { params: { id: string; transactionId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ id: string; transactionId: string \} \}/g,
    '{ params }: { params: Promise<{ id: string; transactionId: string }> }'
  );

  // Pattern 3: { params }: { params: { id: string; resultId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ id: string; resultId: string \} \}/g,
    '{ params }: { params: Promise<{ id: string; resultId: string }> }'
  );

  // Pattern 4: { params }: { params: { id: string; linkId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ id: string; linkId: string \} \}/g,
    '{ params }: { params: Promise<{ id: string; linkId: string }> }'
  );

  // Pattern 5: { params }: { params: { id: string; commentId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ id: string; commentId: string \} \}/g,
    '{ params }: { params: Promise<{ id: string; commentId: string }> }'
  );

  // Pattern 6: { params }: { params: { id: string; tagId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ id: string; tagId: string \} \}/g,
    '{ params }: { params: Promise<{ id: string; tagId: string }> }'
  );

  // Pattern 7: { params }: { params: { transactionId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ transactionId: string \} \}/g,
    '{ params }: { params: Promise<{ transactionId: string }> }'
  );

  // Pattern 8: { params }: { params: { transactionId: string; sectorLineId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ transactionId: string; sectorLineId: string \} \}/g,
    '{ params }: { params: Promise<{ transactionId: string; sectorLineId: string }> }'
  );

  // Pattern 9: { params }: { params: { orgId: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ orgId: string \} \}/g,
    '{ params }: { params: Promise<{ orgId: string }> }'
  );

  // Pattern 10: { params }: { params: { code: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ code: string \} \}/g,
    '{ params }: { params: Promise<{ code: string }> }'
  );

  // Now fix the params.id access patterns
  // We need to add "const { id } = await params;" after try {

  // For single id params - find "const activityId = params.id" or similar and replace
  // Pattern: const activityId = params.id;
  content = content.replace(
    /const activityId = params\.id;/g,
    'const { id: activityId } = await params;'
  );

  // Pattern: const id = params.id;
  content = content.replace(
    /const id = params\.id;/g,
    'const { id } = await params;'
  );

  // Pattern: const { id } = params;
  content = content.replace(
    /const \{ id \} = params;/g,
    'const { id } = await params;'
  );

  // Pattern: const { id: activityId } = params;
  content = content.replace(
    /const \{ id: activityId \} = params;/g,
    'const { id: activityId } = await params;'
  );

  // Pattern: const transactionId = params.transactionId;
  content = content.replace(
    /const transactionId = params\.transactionId;/g,
    'const { transactionId } = await params;'
  );

  // Pattern: const { transactionId } = params;
  content = content.replace(
    /const \{ transactionId \} = params;/g,
    'const { transactionId } = await params;'
  );

  // Pattern: const orgId = params.orgId;
  content = content.replace(
    /const orgId = params\.orgId;/g,
    'const { orgId } = await params;'
  );

  // Pattern: const code = params.code;
  content = content.replace(
    /const code = params\.code;/g,
    'const { code } = await params;'
  );

  // Pattern: const organizationId = params.id;
  content = content.replace(
    /const organizationId = params\.id;/g,
    'const { id: organizationId } = await params;'
  );

  // Pattern: const resultId = params.resultId;
  content = content.replace(
    /const resultId = params\.resultId;/g,
    'const { resultId } = await params;'
  );

  // For double params - find patterns and replace
  // Pattern: const { id: activityId, transactionId } = params;
  content = content.replace(
    /const \{ id: activityId, transactionId \} = params;/g,
    'const { id: activityId, transactionId } = await params;'
  );

  // Pattern: const { id, transactionId } = params;
  content = content.replace(
    /const \{ id, transactionId \} = params;/g,
    'const { id, transactionId } = await params;'
  );

  // Pattern: const { id: activityId, resultId } = params;
  content = content.replace(
    /const \{ id: activityId, resultId \} = params;/g,
    'const { id: activityId, resultId } = await params;'
  );

  // Pattern: const { id, resultId } = params;
  content = content.replace(
    /const \{ id, resultId \} = params;/g,
    'const { id, resultId } = await params;'
  );

  // Pattern: const { transactionId, sectorLineId } = params;
  content = content.replace(
    /const \{ transactionId, sectorLineId \} = params;/g,
    'const { transactionId, sectorLineId } = await params;'
  );

  // Pattern: const { id: activityId, linkId } = params;
  content = content.replace(
    /const \{ id: activityId, linkId \} = params;/g,
    'const { id: activityId, linkId } = await params;'
  );

  // Pattern: const { id, linkId } = params;
  content = content.replace(
    /const \{ id, linkId \} = params;/g,
    'const { id, linkId } = await params;'
  );

  // Pattern: const { id: activityId, commentId } = params;
  content = content.replace(
    /const \{ id: activityId, commentId \} = params;/g,
    'const { id: activityId, commentId } = await params;'
  );

  // Pattern: const { id, commentId } = params;
  content = content.replace(
    /const \{ id, commentId \} = params;/g,
    'const { id, commentId } = await params;'
  );

  // Pattern: const { id: activityId, tagId } = params;
  content = content.replace(
    /const \{ id: activityId, tagId \} = params;/g,
    'const { id: activityId, tagId } = await params;'
  );

  // Pattern: const { id, tagId } = params;
  content = content.replace(
    /const \{ id, tagId \} = params;/g,
    'const { id, tagId } = await params;'
  );

  // Handle inline params.id usage (params.id without const declaration)
  // These need manual review but let's flag them

  fs.writeFileSync(filePath, content);
  console.log(`FIXED: ${filePath}`);
  return true;
}

// Main
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const files = findRouteFiles(apiDir);

console.log(`Found ${files.length} route files\n`);

let fixed = 0;
let skipped = 0;

for (const file of files) {
  if (fixFile(file)) {
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`\n========================================`);
console.log(`Fixed: ${fixed} files`);
console.log(`Skipped: ${skipped} files`);
console.log(`========================================`);
