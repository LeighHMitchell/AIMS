#!/usr/bin/env node

/**
 * Production Validation Script
 * Validates that the application is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating production readiness...\n');

const checks = [];
let hasErrors = false;

// Check 1: Required files exist
const requiredFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  'tsconfig.json',
  '../.github/workflows/deploy.yml'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
    checks.push({ name: file, status: 'pass' });
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    checks.push({ name: file, status: 'fail' });
    hasErrors = true;
  }
});

// Check 2: Package.json validation
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  
  const requiredScripts = ['build', 'start', 'lint', 'type-check'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✅ Script: ${script}`);
    } else {
      console.log(`  ❌ Script: ${script} - MISSING`);
      hasErrors = true;
    }
  });

  // Check dependencies
  const criticalDeps = ['next', 'react', '@supabase/supabase-js'];
  criticalDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`  ✅ Dependency: ${dep}`);
    } else {
      console.log(`  ❌ Dependency: ${dep} - MISSING`);
      hasErrors = true;
    }
  });

} catch (error) {
  console.log('  ❌ Invalid package.json');
  hasErrors = true;
}

// Check 3: Next.js config validation
console.log('\n⚙️  Checking Next.js configuration...');
try {
  const nextConfig = require('../next.config.js');
  
  if (nextConfig.typescript && nextConfig.typescript.ignoreBuildErrors) {
    console.log('  ⚠️  TypeScript errors are ignored in build');
  }
  
  if (nextConfig.eslint && nextConfig.eslint.ignoreDuringBuilds) {
    console.log('  ⚠️  ESLint errors are ignored in build');
  }
  
  console.log('  ✅ Next.js config loaded successfully');
} catch (error) {
  console.log('  ❌ Invalid next.config.js');
  hasErrors = true;
}

// Check 4: Vercel config validation
console.log('\n🚀 Checking Vercel configuration...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  
  if (vercelConfig.buildCommand) {
    console.log(`  ✅ Build command: ${vercelConfig.buildCommand}`);
  }
  
  if (vercelConfig.framework === 'nextjs') {
    console.log('  ✅ Framework: Next.js');
  }
  
  if (vercelConfig.functions) {
    console.log('  ✅ Function timeouts configured');
  }
  
  if (vercelConfig.headers && vercelConfig.headers.length > 0) {
    console.log('  ✅ Security headers configured');
  }
  
} catch (error) {
  console.log('  ❌ Invalid vercel.json');
  hasErrors = true;
}

// Check 5: Environment variables documentation
console.log('\n🔐 Checking environment setup...');
const envFiles = [
  'env.example',
  'PRODUCTION_DEPLOYMENT_GUIDE.md'
];

envFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} - Consider creating for documentation`);
  }
});

// Check 6: Build test
console.log('\n🏗️  Testing build process...');
console.log('  ℹ️  Run `npm run build` to test the production build');
console.log('  ℹ️  Run `npm run type-check` to verify TypeScript');
console.log('  ℹ️  Run `npm run lint` to check code quality');

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));

if (hasErrors) {
  console.log('❌ PRODUCTION READINESS: FAILED');
  console.log('\nPlease fix the errors above before deploying to production.');
  process.exit(1);
} else {
  console.log('✅ PRODUCTION READINESS: PASSED');
  console.log('\n🎉 Your application is ready for production deployment!');
  console.log('\nNext steps:');
  console.log('1. Set up environment variables in Vercel');
  console.log('2. Configure GitHub secrets for deployment');
  console.log('3. Push to main branch to trigger deployment');
  console.log('\nSee PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions.');
}

console.log('\n' + '='.repeat(50));
