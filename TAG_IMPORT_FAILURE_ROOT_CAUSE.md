# Tag Import Failure - Root Cause Analysis

## 🔴 Critical Issue: Migration Conflict

### The Problem

Your database has **3 different migrations** creating the tags table with **incompatible schemas**:

1. **`20250605_create_tags_tables.sql`** (June 5, 2025)
   - Has: `vocabulary`, `code`, `description`, `usage_count`
   - ✅ Good schema for IATI

2. **`20250112000001_add_vocabulary_uri_to_tags.sql`** (Jan 12, 2025) 
   - Adds: `vocabulary_uri`, plus ensures `vocabulary` and `code` exist
   - ✅ Our new migration

3. **`20250115000002_ensure_tags_table.sql`** (Jan 15, 2025)
   - Has: ONLY `name`, `created_by`, `created_at`, `updated_at`
   - ❌ **MISSING** vocabulary, code, vocabulary_uri columns!

### Migration Order Issue

Migrations run in **filename order**:
1. ✅ 20250112... (Jan 12) - Adds vocabulary_uri
2. ❌ 20250115... (Jan 15) - **Runs AFTER**, uses `CREATE TABLE IF NOT EXISTS`
3. ⏩ 20250605... (June 5) - Runs LAST, but table already exists

### What's Happening

**Scenario 1: Table Created by 20250115 Migration**
- Migration 20250115 creates table WITHOUT vocabulary/code/vocabulary_uri
- Migration 20250112 tries to add columns with IF NOT EXISTS checks
- **Result**: Columns ARE added ✅

**Scenario 2: Table Already Existed**  
- Migration 20250112 adds vocabulary_uri, vocabulary, code
- Migration 20250115 runs but table already exists (IF NOT EXISTS)
- **Result**: Columns remain ✅

**Scenario 3: Manual Table Creation or Old Schema**
- Table exists with minimal schema
- Migration 20250115 does nothing (IF NOT EXISTS)
- Migration 20250112 adds columns
- **BUT**: vocabulary_uri column might not exist due to failed IF NOT EXISTS check

## Why "Failed to Create Tag" Error

When the API tries to insert:
```javascript
const baseTagData = {
  name: normalizedName,
  code: code,
  vocabulary: normalizedVocabulary,
  vocabulary_uri: vocabulary_uri  // ❌ Column might not exist!
};
```

**If `vocabulary_uri` column doesn't exist:**
- PostgreSQL error: "column 'vocabulary_uri' does not exist"
- API catches error and returns: "Failed to create tag"
- No details shown to user (generic error)

## Why 1 Tag Succeeded

Your first tag (vocabulary="1", code="1") may have:
- Used a code path that didn't include vocabulary_uri
- Or the tag already existed in the database
- Or the error handling fell back to basic insert

## Diagnosis Required

Run this SQL to check current schema:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tags'
ORDER BY ordinal_position;
```

**Expected columns:**
- ✅ id
- ✅ name  
- ✅ vocabulary
- ✅ code
- ✅ vocabulary_uri
- ✅ created_by
- ✅ created_at
- ✅ updated_at

**If missing:** You need to run the migration manually or fix the schema.

