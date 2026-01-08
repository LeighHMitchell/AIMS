#!/usr/bin/env node
/**
 * Script to fix inline params.id usage in API routes
 * Adds proper await params destructuring at the start of each function
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
  const originalContent = content;

  // Skip if no params.id usage
  if (!content.includes('params.id') &&
      !content.includes('params.transactionId') &&
      !content.includes('params.orgId') &&
      !content.includes('params.code') &&
      !content.includes('params.resultId') &&
      !content.includes('params.linkId') &&
      !content.includes('params.commentId') &&
      !content.includes('params.tagId') &&
      !content.includes('params.sectorLineId')) {
    return false;
  }

  // For each function that uses params.id, we need to:
  // 1. Find the function start (after try {)
  // 2. Add const { id } = await params; if not already there
  // 3. Replace params.id with id

  // Strategy: Find all occurrences of params.X and replace them
  // Then add the destructuring at the function start

  // Determine what params are used
  const usesId = content.includes('params.id');
  const usesTransactionId = content.includes('params.transactionId');
  const usesOrgId = content.includes('params.orgId');
  const usesCode = content.includes('params.code');
  const usesResultId = content.includes('params.resultId');
  const usesLinkId = content.includes('params.linkId');
  const usesCommentId = content.includes('params.commentId');
  const usesTagId = content.includes('params.tagId');
  const usesSectorLineId = content.includes('params.sectorLineId');

  // Build the destructuring parts
  const parts = [];
  if (usesId) parts.push('id');
  if (usesTransactionId) parts.push('transactionId');
  if (usesOrgId) parts.push('orgId');
  if (usesCode) parts.push('code');
  if (usesResultId) parts.push('resultId');
  if (usesLinkId) parts.push('linkId');
  if (usesCommentId) parts.push('commentId');
  if (usesTagId) parts.push('tagId');
  if (usesSectorLineId) parts.push('sectorLineId');

  if (parts.length === 0) return false;

  const destructure = `const { ${parts.join(', ')} } = await params;`;

  // Replace params.X with X
  if (usesId) content = content.replace(/params\.id/g, 'id');
  if (usesTransactionId) content = content.replace(/params\.transactionId/g, 'transactionId');
  if (usesOrgId) content = content.replace(/params\.orgId/g, 'orgId');
  if (usesCode) content = content.replace(/params\.code/g, 'code');
  if (usesResultId) content = content.replace(/params\.resultId/g, 'resultId');
  if (usesLinkId) content = content.replace(/params\.linkId/g, 'linkId');
  if (usesCommentId) content = content.replace(/params\.commentId/g, 'commentId');
  if (usesTagId) content = content.replace(/params\.tagId/g, 'tagId');
  if (usesSectorLineId) content = content.replace(/params\.sectorLineId/g, 'sectorLineId');

  // Now we need to add the destructuring at the start of each function
  // Find patterns like "export async function GET(" ... ") {" ... "try {"
  // and add the destructuring after "try {"

  // Pattern to find function definitions with params
  const funcPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*params[^)]*\)\s*\{[\s\S]*?try\s*\{/g;

  content = content.replace(funcPattern, (match) => {
    // Check if destructuring already exists
    if (match.includes('await params')) {
      return match;
    }
    // Add destructuring after try {
    return match.replace(/try\s*\{/, `try {\n    ${destructure}`);
  });

  // Also handle functions without try block (simpler pattern)
  // For functions that start directly with const supabase = ...
  const simpleFuncPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*params[^)]*\)\s*\{\s*\n(\s*)(const\s+supabase)/g;

  content = content.replace(simpleFuncPattern, (match, method, indent, constLine) => {
    if (match.includes('await params')) {
      return match;
    }
    return match.replace(constLine, `${destructure}\n${indent}${constLine}`);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`FIXED: ${filePath}`);
    return true;
  }

  return false;
}

// Main
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const files = findRouteFiles(apiDir);

console.log(`Found ${files.length} route files\n`);

let fixed = 0;

for (const file of files) {
  if (fixFile(file)) {
    fixed++;
  }
}

console.log(`\n========================================`);
console.log(`Fixed: ${fixed} files`);
console.log(`========================================`);
