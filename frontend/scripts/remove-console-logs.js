#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to match console statements
const consolePatterns = [
  /console\.(log|error|warn|info|debug)\([^)]*\);?/g,
  /console\.(log|error|warn|info|debug)\([^}]*}\);?/g, // Multi-line
];

// Files to process
const filePatterns = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx',
];

// Files to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/scripts/**',
];

function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    consolePatterns.forEach(pattern => {
      const newContent = content.replace(pattern, '');
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Cleaned: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Removing console statements from production code...\n');
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  filePatterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      ignore: excludePatterns,
      nodir: true 
    });
    
    files.forEach(file => {
      totalFiles++;
      if (removeConsoleLogs(file)) {
        modifiedFiles++;
      }
    });
  });
  
  console.log(`\n✅ Complete! Modified ${modifiedFiles} out of ${totalFiles} files.`);
}

// Only run if called directly
if (require.main === module) {
  main();
}

module.exports = { removeConsoleLogs };