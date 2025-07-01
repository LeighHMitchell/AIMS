# Organization Name Refactoring

## Overview

This refactoring addresses a naming mismatch between frontend display and database storage for organizations. Previously, full organization names were being saved to the `name` field instead of properly utilizing the `full_name` and `acronym` fields.

## Problem

- Organization cards displayed full names correctly (e.g., "Department of Foreign Affairs")
- However, these full names were being saved to the `name` column
- The `full_name` and `acronym` columns existed but were not being used properly
- This caused inconsistency between what users saw and how data was stored

## Solution

### 1. Database Schema
The organizations table already had the correct columns:
- `name` - Now used as a fallback/internal identifier
- `full_name` - Stores the full formal organization name
- `acronym` - Stores the short name/acronym

### 2. Data Migration
Created migration script (`frontend/sql/fix_organization_names.sql`) that:
- Backs up existing data
- Populates `full_name` from `name` where appropriate
- Detects acronyms (short names without spaces) and populates `acronym`
- Handles known organizations (DFAT, ADB, UNDP, etc.) with their proper full names

### 3. Code Changes

#### API Updates
- Updated `/api/organizations/route.ts` to properly handle `full_name` and `acronym` fields
- Enhanced validation to check for duplicates in both fields
- Ensures `name` field always has a value (fallback logic)

#### UI Updates
- Updated `processOrganizationsOptimized` to generate proper display names:
  - Shows "Full Name (Acronym)" when both exist
  - Falls back to full_name or name if only one exists
- Organization forms already had separate fields for full name and acronym

#### IATI XML Generation
- Added `addParticipatingOrganizations` method to IATI XML generator
- Uses only `full_name` for `<narrative>` elements (per IATI standard)
- Does NOT include acronyms in XML output

### 4. Migration Tools
Created TypeScript migration script (`frontend/scripts/run-org-name-migration.ts`) that:
- Shows preview of changes before applying
- Updates organizations programmatically
- Handles known organizations with hardcoded mappings
- Provides detailed progress and verification

## Running the Migration

### Option 1: SQL Migration (Recommended for Production)
```sql
-- Run in Supabase SQL Editor
-- See: frontend/sql/fix_organization_names.sql
```

### Option 2: TypeScript Migration Script
```bash
cd frontend
npm run ts-node scripts/run-org-name-migration.ts
```

## Display Logic

Organizations now display as:
- If both full_name and acronym exist: "Department of Foreign Affairs (DFAT)"
- If only full_name exists: "Department of Foreign Affairs"
- If only name exists: Falls back to name field

## Form Behavior

When creating/editing organizations:
- **Full Name** field → saves to `full_name`
- **Acronym** field → saves to `acronym`
- Both fields are required in the UI

## IATI Compliance

When generating IATI XML:
- `<participating-org>` elements use `full_name` for `<narrative>`
- Acronyms are NOT included in the XML
- Organization type and IATI identifier are properly mapped

## Verification

After migration, verify:
1. All organizations have proper `full_name` values
2. Acronyms are populated where appropriate
3. Organization cards display correctly
4. IATI exports use full names only
5. Search and filters work with new naming

## Rollback

If needed, restore from backup:
```sql
-- Restore original data
UPDATE organizations o
SET 
  name = b.name,
  full_name = b.full_name,
  acronym = b.acronym
FROM organizations_name_backup b
WHERE o.id = b.id;
``` 