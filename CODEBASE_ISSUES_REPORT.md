# Codebase Issues Report

## Summary
This report documents all bugs, errors, and implementation issues found during a comprehensive scan of the codebase. Issues are grouped by severity (Critical, High, Medium, Low) and file location.

## Critical Issues (Security & Data Loss Risk)

### 1. **aims/settings.py**
- **Line 23**: Hardcoded SECRET_KEY exposed in settings
  - **Issue**: Django SECRET_KEY is hardcoded and visible in the repository
  - **Impact**: Critical security vulnerability - anyone with access to the code can compromise sessions and security tokens
  - **Affected**: All Django security features including session management, password resets, and CSRF protection

- **Line 143-144**: OAuth2 credentials hardcoded
  - **Issue**: Google OAuth2 client ID and secret are hardcoded in settings
  - **Impact**: Anyone can use these credentials to impersonate the application
  - **Affected**: Google OAuth authentication

- **Line 26**: DEBUG = True in production-ready code
  - **Issue**: Debug mode exposes sensitive information in error pages
  - **Impact**: Information disclosure vulnerability
  - **Affected**: All error pages and debug information

### 2. **frontend/next.config.js**
- **Line 25**: CORS set to allow all origins (*)
  - **Issue**: `Access-Control-Allow-Origin: *` allows any website to call the API
  - **Impact**: CSRF attacks, unauthorized API access
  - **Affected**: All API endpoints

### 3. **frontend/src/middleware.ts**
- **Line 23**: CORS set to allow all origins (*)
  - **Issue**: Same CORS vulnerability as above
  - **Impact**: Security vulnerability allowing cross-origin attacks
  - **Affected**: All API routes

- **Missing**: No authentication middleware
  - **Issue**: No authentication checks in middleware
  - **Impact**: Unauthorized access to protected routes
  - **Affected**: All protected API endpoints

### 4. **frontend/src/app/layout.tsx**
- **Line 26**: Google Maps API key exposed in client-side code
  - **Issue**: API key visible in browser source code
  - **Impact**: Unauthorized usage and potential billing issues
  - **Affected**: Google Maps functionality

## High Priority Issues (Functionality & Reliability)

### 1. **aims/settings.py**
- **Line 42**: Inconsistent indentation (tabs vs spaces)
  - **Issue**: Using tabs instead of spaces (Python style violation)
  - **Impact**: Potential parsing errors, maintenance issues
  - **Affected**: Settings parsing

- **Missing**: No STATIC_ROOT defined
  - **Issue**: Required for production deployment with collectstatic
  - **Impact**: Static files won't be served properly in production
  - **Affected**: All static assets

- **Missing**: No environment-based configuration
  - **Issue**: No separation between development and production settings
  - **Impact**: Production deployment issues
  - **Affected**: All configuration

### 2. **projects/models.py**
- **Line 2**: Using User model directly instead of get_user_model()
  - **Issue**: Hard dependency on default User model
  - **Impact**: Cannot use custom user models
  - **Affected**: All user-related functionality

- **Line 6**: Unused import (json)
  - **Issue**: Code cleanliness
  - **Impact**: None, but indicates lack of linting
  - **Affected**: None

- **Line 620-628**: Malformed signal handlers
  - **Issue**: Missing imports and incorrect decorator syntax
  - **Impact**: User profiles won't be created automatically
  - **Affected**: User registration

- **Line 180**: Division by zero possibility in progress_percentage
  - **Issue**: No check for zero total_days
  - **Impact**: Application crash when calculating progress
  - **Affected**: Project progress display

### 3. **projects/views.py**
- **Line 16**: Unused import (logging)
  - **Issue**: Logger imported but never used
  - **Impact**: None, but indicates incomplete implementation
  - **Affected**: None

- **Line 438, 471**: SQL injection vulnerability with .extra()
  - **Issue**: Using string formatting in SQL queries
  - **Impact**: Potential SQL injection attacks
  - **Affected**: Analytics dashboard

- **Line 493-494**: Missing null checks for related objects
  - **Issue**: Accessing .name on potentially None objects
  - **Impact**: AttributeError crashes
  - **Affected**: CSV export functionality

- **Line 500**: Missing error handling for JSON parsing
  - **Issue**: json.loads() without try-except
  - **Impact**: Server crash on malformed JSON
  - **Affected**: API endpoints

### 4. **frontend/package.json & package.json**
- **Duplicate dependencies**: Packages listed in both dependencies and devDependencies
  - **Issue**: @types/react, @types/react-dom, autoprefixer, postcss, tailwindcss
  - **Impact**: Confusion, potential version conflicts
  - **Affected**: Build process

- **Version inconsistencies**: Different versions of same packages
  - **Issue**: leaflet "1.9" vs "^1.9.4", react-leaflet versions differ
  - **Impact**: Potential runtime errors
  - **Affected**: Map functionality

## Medium Priority Issues (Performance & Best Practices)

### 1. **frontend/src/lib/supabase.ts**
- **Line 49, 62**: Using `null as any` defeats TypeScript
  - **Issue**: Bypassing type safety
  - **Impact**: Runtime errors not caught at compile time
  - **Affected**: Supabase client initialization

- **Error handling**: Swallowing errors without proper propagation
  - **Issue**: Errors logged but not thrown
  - **Impact**: Silent failures
  - **Affected**: Database operations

### 2. **Console logging in production**
- **Multiple files**: Extensive console.log statements throughout
  - **Issue**: Debug logs exposed in production
  - **Impact**: Information disclosure, performance impact
  - **Affected**: All frontend functionality
  - **Files**: middleware.ts, activity-logger.ts, organizationGroups.ts, useUser.tsx, supabase.ts, usePartners.tsx, ContactsSection.tsx, activities/page.tsx, and many more

### 3. **projects/views.py**
- **Line 130**: Unnecessary immediate save of new project
  - **Issue**: Creating and saving empty project immediately
  - **Impact**: Database pollution with empty records
  - **Affected**: Project creation flow

## Low Priority Issues (Code Quality)

### 1. **Missing Error Boundaries**
- **Issue**: No React error boundaries implemented
- **Impact**: Entire app crashes on component errors
- **Affected**: User experience

### 2. **No Rate Limiting**
- **Issue**: APIs have no rate limiting
- **Impact**: Vulnerable to DoS attacks
- **Affected**: All API endpoints

### 3. **Missing Input Validation**
- **Issue**: Limited client-side validation
- **Impact**: Poor user experience, server load
- **Affected**: All forms

### 4. **No Logging Strategy**
- **Issue**: Mix of console.log and no centralized logging
- **Impact**: Difficult debugging in production
- **Affected**: Error tracking and monitoring

## Database & Data Integrity Issues

### 1. **Missing Database Constraints**
- **Issue**: Several DecimalFields without MinValueValidator
- **Impact**: Negative values allowed where they shouldn't be
- **Affected**: Financial fields

### 2. **Missing Indexes**
- **Issue**: No custom indexes defined for frequently queried fields
- **Impact**: Poor query performance
- **Affected**: Database performance

## Recommendations

1. **Immediate Actions Required**:
   - Move all secrets to environment variables
   - Disable DEBUG in production
   - Implement proper CORS configuration
   - Add authentication middleware

2. **High Priority Fixes**:
   - Fix SQL injection vulnerabilities
   - Add proper error handling
   - Fix signal handlers
   - Configure static files properly

3. **Medium Priority Improvements**:
   - Remove console.log statements
   - Implement proper logging
   - Add input validation
   - Fix TypeScript type safety issues

4. **Long-term Improvements**:
   - Implement rate limiting
   - Add monitoring and alerting
   - Improve test coverage
   - Add API documentation