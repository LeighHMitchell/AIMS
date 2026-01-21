const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../src/app/api');

// Find all route files
function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts' && !fullPath.includes('.backup')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Check if file imports requireAuth but doesn't call it properly
function isBroken(content) {
  const importsRequireAuth = /import\s*\{[^}]*requireAuth[^}]*\}\s*from\s*['"]@\/lib\/auth['"]/.test(content);
  const callsRequireAuth = /const\s*\{[^}]*supabase[^}]*\}\s*=\s*await\s+requireAuth\s*\(\s*\)/.test(content);
  const usesSupabase = /if\s*\(\s*!supabase\s*\)/.test(content) || /await\s+supabase\./.test(content);
  
  return importsRequireAuth && !callsRequireAuth && usesSupabase;
}

// Fix a broken route file
function fixRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all export async function declarations
  const handlers = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  let modified = false;
  
  for (const handler of handlers) {
    // Match: export async function GET(request: NextRequest) { ... try {
    // We need to add the requireAuth call after the opening brace of try or directly after function opening
    
    // Pattern 1: Has try block immediately
    const tryPattern = new RegExp(
      `(export\\s+async\\s+function\\s+${handler}\\s*\\([^)]*\\)\\s*\\{[^]*?)(\\s*try\\s*\\{)`,
      'g'
    );
    
    if (tryPattern.test(content)) {
      content = content.replace(tryPattern, (match, funcStart, tryStart) => {
        // Check if this handler already has requireAuth call
        const afterTry = content.slice(content.indexOf(match) + match.length, content.indexOf(match) + match.length + 200);
        if (afterTry.includes('await requireAuth()')) {
          return match; // Already has it
        }
        modified = true;
        return `${funcStart}${tryStart}
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
`;
      });
    }
    
    // Pattern 2: No try block, function starts with other code
    // This is more complex - we need to add after the opening brace
    const directPattern = new RegExp(
      `(export\\s+async\\s+function\\s+${handler}\\s*\\([^)]*\\)\\s*\\{)([^]*?)(?=\\s*(const|let|var|if|return|await|//|/\\*))`,
      'g'
    );
    
    // Reset the content to original and try different approach
  }
  
  // Simpler approach: Find each handler and inject after first opening brace of try or function
  for (const handler of handlers) {
    const funcRegex = new RegExp(`export\\s+async\\s+function\\s+${handler}\\s*\\([^)]*\\)\\s*\\{`, 'g');
    let match;
    let offset = 0;
    
    while ((match = funcRegex.exec(content)) !== null) {
      const insertPos = match.index + match[0].length + offset;
      
      // Check if already has requireAuth call within next 300 chars
      const nextChars = content.slice(insertPos, insertPos + 300);
      if (nextChars.includes('await requireAuth()')) {
        continue;
      }
      
      // Check if there's a try { immediately after
      const hasTryBlock = /^\s*try\s*\{/.test(nextChars);
      
      let injection;
      if (hasTryBlock) {
        // Insert after try {
        const tryMatch = nextChars.match(/^(\s*try\s*\{)/);
        if (tryMatch) {
          const tryPos = insertPos + tryMatch[0].length;
          injection = `
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;
`;
          content = content.slice(0, tryPos) + injection + content.slice(tryPos);
          offset += injection.length;
          modified = true;
        }
      } else {
        // Insert directly after function opening brace
        injection = `
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
`;
        content = content.slice(0, insertPos) + injection + content.slice(insertPos);
        offset += injection.length;
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Main
const allRoutes = findRouteFiles(API_DIR);
console.log(`Found ${allRoutes.length} route files`);

let fixedCount = 0;
let brokenFiles = [];

for (const route of allRoutes) {
  const content = fs.readFileSync(route, 'utf8');
  if (isBroken(content)) {
    brokenFiles.push(route);
  }
}

console.log(`Found ${brokenFiles.length} broken files that need fixing`);
console.log('\nBroken files:');
brokenFiles.slice(0, 20).forEach(f => console.log('  -', path.relative(API_DIR, f)));
if (brokenFiles.length > 20) {
  console.log(`  ... and ${brokenFiles.length - 20} more`);
}

// Fix files
console.log('\nFixing files...');
for (const filePath of brokenFiles) {
  try {
    if (fixRoute(filePath)) {
      fixedCount++;
      console.log('  Fixed:', path.relative(API_DIR, filePath));
    }
  } catch (err) {
    console.error('  Error fixing', path.relative(API_DIR, filePath), err.message);
  }
}

console.log(`\nFixed ${fixedCount} files`);
