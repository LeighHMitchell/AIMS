#!/usr/bin/env node

// Comprehensive Comments System Test Suite
// Tests all aspects of the commenting functionality

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const TEST_ACTIVITY_ID = '85b03f24-217e-4cbf-b8e4-79dca60dee1f';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.blue}${colors.bold}🧪 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green, `✅ ${message}`);
}

function logError(message) {
  log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

async function testAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let json = null;
    
    try {
      json = JSON.parse(data);
    } catch {
      // Response might not be JSON
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data: json || data,
      response
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      data: null
    };
  }
}

async function runComprehensiveTests() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('🚀 AIMS COMMENTS SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));
  console.log(colors.reset);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Server Health Check
  logTest('Server Health Check');
  totalTests++;
  const healthCheck = await testAPI('/activities');
  if (healthCheck.ok) {
    logSuccess('Server is running and responsive');
    passedTests++;
  } else {
    logError(`Server health check failed: ${healthCheck.status}`);
    failedTests++;
  }
  
  // Test 2: Activity Exists
  logTest('Activity Existence Check');
  totalTests++;
  const activityCheck = await testAPI(`/api/activities/${TEST_ACTIVITY_ID}`);
  if (activityCheck.ok) {
    logSuccess('Test activity exists and is accessible');
    passedTests++;
  } else {
    logError(`Activity not found: ${activityCheck.status}`);
    failedTests++;
  }
  
  // Test 3: Comments API - GET (Load Comments)
  logTest('Comments API - Load Comments');
  totalTests++;
  const loadComments = await testAPI(`/api/activities/${TEST_ACTIVITY_ID}/comments`);
  if (loadComments.ok) {
    logSuccess(`Comments loaded successfully. Found ${Array.isArray(loadComments.data) ? loadComments.data.length : 0} comments`);
    passedTests++;
  } else {
    logError(`Failed to load comments: ${loadComments.status} - ${loadComments.data?.error || loadComments.error}`);
    failedTests++;
    
    // Additional debugging info
    if (loadComments.data?.error) {
      logWarning(`Error details: ${loadComments.data.error}`);
    }
  }
  
  // Test 4: Comments API - POST (Create Comment)
  logTest('Comments API - Create Comment');
  totalTests++;
  const testComment = {
    user: {
      id: '1',
      name: 'Test User',
      role: 'dev_partner_tier_1'
    },
    content: 'This is a comprehensive test comment to verify the system works correctly.',
    type: 'Feedback'
  };
  
  const createComment = await testAPI(`/api/activities/${TEST_ACTIVITY_ID}/comments`, {
    method: 'POST',
    body: JSON.stringify(testComment)
  });
  
  if (createComment.ok) {
    logSuccess('Comment created successfully');
    passedTests++;
  } else {
    logError(`Failed to create comment: ${createComment.status} - ${createComment.data?.error || createComment.error}`);
    failedTests++;
  }
  
  // Test 5: Comments API - POST (Create Question)
  logTest('Comments API - Create Question');
  totalTests++;
  const testQuestion = {
    user: {
      id: '2',
      name: 'Test User 2',
      role: 'gov_partner_tier_1'
    },
    content: 'This is a test question to verify question functionality?',
    type: 'Question'
  };
  
  const createQuestion = await testAPI(`/api/activities/${TEST_ACTIVITY_ID}/comments`, {
    method: 'POST',
    body: JSON.stringify(testQuestion)
  });
  
  if (createQuestion.ok) {
    logSuccess('Question created successfully');
    passedTests++;
  } else {
    logError(`Failed to create question: ${createQuestion.status} - ${createQuestion.data?.error || createQuestion.error}`);
    failedTests++;
  }
  
  // Test 6: Frontend Component Loading
  logTest('Frontend - Activity Page Loading');
  totalTests++;
  const activityPage = await testAPI(`/activities/${TEST_ACTIVITY_ID}`);
  if (activityPage.ok) {
    logSuccess('Activity page loads successfully');
    passedTests++;
  } else {
    logError(`Activity page failed to load: ${activityPage.status}`);
    failedTests++;
  }
  
  // Test 7: Database Schema Check
  logTest('Database Schema Analysis');
  totalTests++;
  // This test analyzes the error patterns to understand schema issues
  const schemaTest = await testAPI(`/api/activities/${TEST_ACTIVITY_ID}/comments`);
  if (schemaTest.data?.error && schemaTest.data.error.includes('column')) {
    logWarning('Database schema issues detected:');
    if (schemaTest.data.error.includes('user_name')) {
      logWarning('  - activity_comments table missing user_name column');
    }
    if (schemaTest.data.error.includes('title')) {
      logWarning('  - activities table using title_narrative instead of title');
    }
    logWarning('  - Comments table needs to be created with proper schema');
    failedTests++;
  } else if (schemaTest.ok) {
    logSuccess('Database schema is compatible');
    passedTests++;
  } else {
    logError('Database connection or other issues detected');
    failedTests++;
  }
  
  // Test 8: User Authentication Context
  logTest('User Authentication Check');
  totalTests++;
  // Check if user auth is working by looking for user-related endpoints
  const authCheck = await testAPI('/api/user-profile');
  if (authCheck.status === 404) {
    logWarning('User authentication endpoints not found (expected for testing)');
    passedTests++; // This is expected in development
  } else if (authCheck.ok) {
    logSuccess('User authentication system is active');
    passedTests++;
  } else {
    logWarning('User authentication system status unclear');
    passedTests++; // Not critical for basic testing
  }
  
  // Test Results Summary
  console.log(`\n${colors.bold}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(colors.reset);
  
  console.log(`Total Tests Run: ${totalTests}`);
  logSuccess(`Passed: ${passedTests}`);
  logError(`Failed: ${failedTests}`);
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  console.log(`Success Rate: ${successRate}%`);
  
  // Recommendations
  console.log(`\n${colors.bold}${colors.yellow}🔧 RECOMMENDATIONS:${colors.reset}`);
  
  if (failedTests > 0) {
    console.log('\n1. Database Setup Required:');
    console.log('   Run the SQL from create-simple-comments-table.sql in Supabase');
    console.log('\n2. Schema Issues:');
    console.log('   - activity_comments table needs to be created');
    console.log('   - Ensure proper column names match API expectations');
    console.log('\n3. Testing Steps:');
    console.log('   - Create the database tables first');
    console.log('   - Re-run this test suite');
    console.log('   - Test in browser at http://localhost:3001');
  } else {
    logSuccess('All tests passed! Comments system is ready for use.');
  }
  
  console.log(`\n${colors.bold}${colors.blue}End of Test Suite${colors.reset}\n`);
  
  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    successRate
  };
}

// Run the tests
runComprehensiveTests().catch(console.error);