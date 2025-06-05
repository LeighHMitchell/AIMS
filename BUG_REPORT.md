# Codebase Bug Report

## Critical Security Issues

### 1. Hardcoded Credentials in `aims/settings.py`
- **Severity**: CRITICAL
- **File**: `aims/settings.py`
- **Lines**: 23, 142-143
- **Issue**: 
  - Hardcoded SECRET_KEY exposed
  - Hardcoded Google OAuth2 credentials exposed
- **Impact**: Complete security compromise if code is public

### 2. Hardcoded API Keys in Documentation
- **Severity**: HIGH
- **File**: `DEPLOYMENT_GUIDE.md`
- **Lines**: 44-45
- **Issue**: Supabase API keys exposed in documentation
- **Impact**: Database access compromise

## High Priority Issues

### 3. Debug Mode Enabled in Production Settings
- **Severity**: HIGH
- **File**: `aims/settings.py`
- **Line**: 26
- **Issue**: `DEBUG = True` should not be hardcoded for production
- **Impact**: Exposes sensitive error information

### 4. Missing Static Root Configuration
- **Severity**: MEDIUM
- **File**: `aims/settings.py`
- **Issue**: STATIC_ROOT is not configured
- **Impact**: Static files won't be collected properly for production

### 5. Tab Character Instead of Spaces
- **Severity**: LOW
- **File**: `aims/settings.py`
- **Line**: 41
- **Issue**: Tab character used instead of spaces (PEP 8 violation)
- **Impact**: Code style inconsistency

## Code Organization Issues

### 6. Misplaced Import Statements
- **Severity**: LOW
- **File**: `projects/models.py`
- **Lines**: 616-617
- **Issue**: Signal imports placed in middle of file instead of at top
- **Impact**: Poor code organization, harder to maintain

### 7. Missing Import Statement
- **Severity**: MEDIUM
- **File**: `projects/models.py`
- **Issue**: Missing imports for `receiver` and `post_save` at the top of file
- **Impact**: Code organization issue

## Frontend Issues

### 8. Duplicate Dependencies
- **Severity**: LOW
- **File**: `frontend/package.json`
- **Issue**: Several packages listed in both dependencies and devDependencies
  - @types/react
  - @types/react-dom
  - autoprefixer
  - postcss
  - tailwindcss
- **Impact**: Confusion about package roles, potential version conflicts

## Database & Model Issues

### 9. Potential Data Loss with CASCADE Deletions
- **Severity**: MEDIUM
- **File**: `projects/models.py`
- **Issue**: Several ForeignKey fields use CASCADE deletion which could cause unintended data loss
- **Impact**: Deleting a donor or country could delete all related projects

### 10. Missing Database Indexes
- **Severity**: MEDIUM
- **File**: `projects/models.py`
- **Issue**: No indexes defined for frequently queried fields
- **Impact**: Poor query performance

## Configuration Issues

### 11. Hardcoded ALLOWED_HOSTS
- **Severity**: MEDIUM
- **File**: `aims/settings.py`
- **Line**: 28
- **Issue**: ALLOWED_HOSTS hardcoded instead of environment-based
- **Impact**: Inflexible deployment configuration

### 12. No Environment Variable Management
- **Severity**: HIGH
- **File**: Throughout codebase
- **Issue**: No use of environment variables for sensitive configuration
- **Impact**: Security risk, inflexible deployment

## Missing Error Handling

### 13. No Error Handling in View Functions
- **Severity**: MEDIUM
- **Files**: `projects/views.py`
- **Issue**: Many view functions lack try-except blocks
- **Impact**: Unhandled exceptions could crash the application

### 14. Missing Validation in Models
- **Severity**: MEDIUM
- **File**: `projects/models.py`
- **Issue**: Several model fields lack proper validation
- **Impact**: Invalid data could be saved to database

## Performance Issues

### 15. N+1 Query Problems
- **Severity**: MEDIUM
- **File**: `projects/views.py`
- **Issue**: Several views don't use select_related/prefetch_related
- **Impact**: Poor performance with large datasets

## Summary

Total Issues Found: 15
- Critical: 2
- High: 3
- Medium: 8
- Low: 2

These issues should be addressed in order of severity, starting with the critical security issues.