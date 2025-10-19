#!/usr/bin/env node
/**
 * Parser Verification Script
 * 
 * This script tests the document-link parsing logic by simulating
 * the parser behavior with the test XML files.
 * 
 * Run with: node test_parser_verification.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testParser() {
  log('\n=== Document Links Parser Verification ===\n', 'cyan');
  
  const testFiles = [
    'test_document_links_basic.xml',
    'test_document_links_edge_cases.xml',
    'test_document_links_separation.xml',
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  testFiles.forEach((filename, index) => {
    log(`\nTest Suite ${index + 1}: ${filename}`, 'blue');
    log('─'.repeat(60), 'blue');
    
    const filepath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filepath)) {
      log(`  ❌ File not found: ${filename}`, 'red');
      failedTests++;
      totalTests++;
      return;
    }
    
    const xmlContent = fs.readFileSync(filepath, 'utf-8');
    const results = parseDocumentLinks(xmlContent);
    
    // Test expectations based on file
    let expectedCount;
    let expectedValidCount;
    let testName;
    
    switch (filename) {
      case 'test_document_links_basic.xml':
        expectedCount = 3;
        expectedValidCount = 3;
        testName = 'Basic Documents';
        break;
      case 'test_document_links_edge_cases.xml':
        expectedCount = 10; // Parser finds all
        expectedValidCount = 8; // Only 8 have valid URLs
        testName = 'Edge Cases';
        break;
      case 'test_document_links_separation.xml':
        expectedCount = 2; // Only activity-level
        expectedValidCount = 2;
        testName = 'Activity/Result Separation';
        break;
    }
    
    // Test 1: Count found
    totalTests++;
    if (results.found === expectedCount) {
      log(`  ✅ Found ${results.found} document-link elements (expected ${expectedCount})`, 'green');
      passedTests++;
    } else {
      log(`  ❌ Found ${results.found} document-link elements (expected ${expectedCount})`, 'red');
      failedTests++;
    }
    
    // Test 2: Valid URLs count
    totalTests++;
    if (results.valid === expectedValidCount) {
      log(`  ✅ ${results.valid} documents have valid URLs (expected ${expectedValidCount})`, 'green');
      passedTests++;
    } else {
      log(`  ❌ ${results.valid} documents have valid URLs (expected ${expectedValidCount})`, 'red');
      failedTests++;
    }
    
    // Test 3: URL fixing
    if (filename === 'test_document_links_edge_cases.xml') {
      totalTests++;
      const malformedUrls = results.documents.filter(doc => 
        doc.originalUrl && doc.originalUrl !== doc.url
      );
      if (malformedUrls.length === 2) {
        log(`  ✅ Fixed ${malformedUrls.length} malformed URLs`, 'green');
        malformedUrls.forEach(doc => {
          log(`     ${doc.originalUrl} → ${doc.url}`, 'cyan');
        });
        passedTests++;
      } else {
        log(`  ❌ Expected 2 fixed URLs, found ${malformedUrls.length}`, 'red');
        failedTests++;
      }
    }
    
    // Show document details
    log(`\n  Documents found:`, 'yellow');
    results.documents.forEach((doc, i) => {
      log(`    ${i + 1}. ${doc.title || 'Untitled'}`, 'cyan');
      log(`       URL: ${doc.url}`, 'cyan');
      log(`       Format: ${doc.format || 'not specified'}`, 'cyan');
      log(`       Category: ${doc.category_code || 'not specified'}`, 'cyan');
    });
  });
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Summary:', 'cyan');
  log(`  Total Tests: ${totalTests}`, 'blue');
  log(`  Passed: ${passedTests}`, 'green');
  log(`  Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, failedTests > 0 ? 'yellow' : 'green');
  log('='.repeat(60) + '\n', 'cyan');
  
  if (failedTests === 0) {
    log('🎉 All tests passed! Parser logic is working correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the parser implementation.', 'red');
  }
  
  return failedTests === 0;
}

/**
 * Parse document-links from XML content
 * Simulates the parser behavior
 */
function parseDocumentLinks(xmlContent) {
  const results = {
    found: 0,
    valid: 0,
    documents: [],
  };
  
  // Parse XML (simple regex-based for this test)
  // In production, use proper XML parser (DOMParser in browser)
  
  // Find activity-level document-links only (use :scope > document-link selector equivalent)
  // Match <document-link...>...</document-link> at activity level, not in results
  
  // Split into sections
  const activityMatch = xmlContent.match(/<iati-activity[^>]*>([\s\S]*?)<\/iati-activity>/);
  if (!activityMatch) {
    return results;
  }
  
  const activityContent = activityMatch[1];
  
  // Remove result sections to only get activity-level docs
  const contentWithoutResults = activityContent.replace(/<result[^>]*>[\s\S]*?<\/result>/g, '');
  
  // Find all document-link elements
  const docLinkPattern = /<document-link([^>]*)>([\s\S]*?)<\/document-link>/g;
  let match;
  
  while ((match = docLinkPattern.exec(contentWithoutResults)) !== null) {
    results.found++;
    
    const attributes = match[1];
    const content = match[2];
    
    // Extract attributes
    const urlMatch = attributes.match(/url=["']([^"']*)["']/);
    const formatMatch = attributes.match(/format=["']([^"']*)["']/);
    
    const url = urlMatch ? urlMatch[1] : null;
    
    // Skip if no URL or empty URL
    if (!url || !url.trim()) {
      continue;
    }
    
    // Fix malformed URLs
    let fixedUrl = url.trim();
    const originalUrl = fixedUrl;
    
    if (fixedUrl.startsWith('http:') && !fixedUrl.startsWith('http://')) {
      fixedUrl = fixedUrl.replace('http:', 'http://');
    }
    if (fixedUrl.startsWith('https:') && !fixedUrl.startsWith('https://')) {
      fixedUrl = fixedUrl.replace('https:', 'https://');
    }
    
    // Extract title
    const titleMatch = content.match(/<title[^>]*>[\s\S]*?<narrative[^>]*>([\s\S]*?)<\/narrative>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"') : null;
    
    // Extract category
    const categoryMatch = content.match(/<category\s+code=["']([^"']*)["']/);
    const category_code = categoryMatch ? categoryMatch[1] : null;
    
    // Extract format
    const format = formatMatch ? formatMatch[1] : null;
    
    results.valid++;
    results.documents.push({
      url: fixedUrl,
      originalUrl: originalUrl !== fixedUrl ? originalUrl : null,
      format,
      title,
      category_code,
    });
  }
  
  return results;
}

// Run tests
const success = testParser();
process.exit(success ? 0 : 1);

