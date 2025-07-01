# IATI Activities Table Alignment

This migration aligns the `activities` table with the IATI Activity Standard v2.03 by renaming columns and adding required fields.

## Quick Start

```bash
# 1. Check readiness
npm run tsx frontend/scripts/check-iati-alignment-readiness.ts

# 2. Fix any issues (if needed)
# Option A: Using psql (supports progress messages)
psql -d your_database -f frontend/sql/fix_iati_id_issues.sql

# Option B: Using any SQL client
# Run the commands in: frontend/sql/fix_iati_id_issues_standard.sql

# 3. Run the migration
# Option A: Using psql (with detailed output)
psql -d your_database -f frontend/sql/align_activities_iati_standard.sql

# Option B: Using any SQL client (simple version)
# Run: frontend/sql/align_activities_iati_standard_simple.sql
```

### Script Versions

We provide two versions of each script:

1. **Full versions** (`fix_iati_id_issues.sql`, `align_activities_iati_standard.sql`)
   - Include `\echo` commands for progress messages
   - Must be run with `psql` command line tool
   - Provide detailed feedback during execution

2. **Standard SQL versions** (`*_standard.sql`, `*_simple.sql`)
   - Pure SQL without psql meta-commands
   - Can be run in any SQL client (pgAdmin, DBeaver, Supabase Studio, etc.)
   - Same functionality, less verbose output

## Overview

The International Aid Transparency Initiative (IATI) standard defines specific field names and structures for activity data. This migration:

1. **Renames columns** to match IATI naming conventions
2. **Adds required IATI fields** (hierarchy, linked_data_uri)
3. **Ensures data integrity** with constraints and indexes
4. **Creates a compliant view** for easy querying

## Column Renames

| Current Name | IATI Name | Purpose |
|--------------|-----------|---------|
| `iati_id` | `iati_identifier` | Unique activity identifier |
| `title` | `title_narrative` | Activity title text |
| `description` | `description_narrative` | Activity description text |
| `tied_status` | `default_tied_status` | Default tied aid status |
| `partner_id` | `other_identifier` | Alternative activity identifier |

## New Fields Added

- **`hierarchy`** (INTEGER, default 1) - IATI hierarchy level:
  - 1 = Standalone activity
  - 2 = Parent activity
  - 3 = Child activity
  
- **`linked_data_uri`** (TEXT) - Optional URI for linked data representation

- **`reporting_org_id`** (UUID) - Foreign key to organizations table (if not already present)

## Pre-Migration Checklist

### 1. Check for Issues

Run the readiness check script:

```bash
npm run tsx frontend/scripts/check-iati-alignment-readiness.ts
```

This will check for:
- NULL `iati_id` values
- Duplicate `iati_id` values
- Columns that will be renamed
- Existing IATI fields

### 2. Fix Any Issues

#### NULL iati_id values
If you have activities without IATI identifiers:

```sql
-- Generate identifiers for activities missing iati_id
UPDATE activities 
SET iati_id = CONCAT(
  (SELECT iati_org_id FROM organizations WHERE id = activities.created_by_org),
  '-',
  activities.id
)
WHERE iati_id IS NULL;
```

#### Duplicate iati_id values
For duplicate identifiers:

```sql
-- Find duplicates
SELECT iati_id, COUNT(*) 
FROM activities 
GROUP BY iati_id 
HAVING COUNT(*) > 1;

-- Fix by appending sequence number
WITH duplicates AS (
  SELECT 
    id,
    iati_id,
    ROW_NUMBER() OVER (PARTITION BY iati_id ORDER BY created_at) - 1 as seq
  FROM activities
  WHERE iati_id IN (
    SELECT iati_id 
    FROM activities 
    GROUP BY iati_id 
    HAVING COUNT(*) > 1
  )
)
UPDATE activities a
SET iati_id = d.iati_id || '-' || d.seq
FROM duplicates d
WHERE a.id = d.id AND d.seq > 0;
```

## Running the Migration

Once all issues are resolved:

```bash
# Run the migration
psql -d your_database -f frontend/sql/align_activities_iati_standard.sql
```

The migration will:
1. Show pre-flight checks
2. Rename columns safely
3. Add new IATI fields
4. Create constraints and indexes
5. Create the `activities_iati_compliant` view

## Post-Migration Updates

### Update Application Code

Replace old column names with new ones:

```typescript
// Before
const activity = {
  iati_id: 'XM-DAC-12-1-123',
  title: 'Health Program',
  description: 'Primary healthcare...',
  tied_status: 'untied',
  partner_id: 'ALT-123'
};

// After
const activity = {
  iati_identifier: 'XM-DAC-12-1-123',
  title_narrative: 'Health Program',
  description_narrative: 'Primary healthcare...',
  default_tied_status: 'untied',
  other_identifier: 'ALT-123'
};
```

### Update Queries

```typescript
// Update Supabase queries
const { data } = await supabase
  .from('activities')
  .select(`
    iati_identifier,
    title_narrative,
    description_narrative,
    default_tied_status,
    hierarchy,
    reporting_org:organizations!reporting_org_id(
      iati_org_id,
      name
    )
  `);
```

### Use the IATI-Compliant View

For easier querying with backward compatibility:

```sql
-- The view handles both old and new column names
SELECT * FROM activities_iati_compliant
WHERE reporting_org_ref = 'XM-DAC-12-1';
```

## Verification

After migration, verify the changes:

```sql
-- Check renamed columns
\d activities

-- Test the view
SELECT 
  iati_identifier,
  title_narrative,
  reporting_org_ref,
  hierarchy
FROM activities_iati_compliant
LIMIT 5;

-- Check constraints
\d activities
```

## Rollback (if needed)

To rollback the migration:

```sql
-- Rename columns back
ALTER TABLE activities RENAME COLUMN iati_identifier TO iati_id;
ALTER TABLE activities RENAME COLUMN title_narrative TO title;
ALTER TABLE activities RENAME COLUMN description_narrative TO description;
ALTER TABLE activities RENAME COLUMN default_tied_status TO tied_status;
ALTER TABLE activities RENAME COLUMN other_identifier TO partner_id;

-- Drop new columns
ALTER TABLE activities DROP COLUMN IF EXISTS hierarchy;
ALTER TABLE activities DROP COLUMN IF EXISTS linked_data_uri;

-- Drop view
DROP VIEW IF EXISTS activities_iati_compliant;

-- Drop constraints
ALTER TABLE activities DROP CONSTRAINT IF EXISTS unique_iati_identifier;
DROP INDEX IF EXISTS idx_activities_reporting_org_id;
```

## IATI Export Compatibility

After this migration, your activities table is ready for IATI XML export:

```xml
<iati-activity hierarchy="1" linked-data-uri="...">
  <iati-identifier>XM-DAC-12-1-123</iati-identifier>
  <reporting-org ref="XM-DAC-12-1" type="10">
    <narrative>Organization Name</narrative>
  </reporting-org>
  <title>
    <narrative>Health Program</narrative>
  </title>
  <description>
    <narrative>Primary healthcare...</narrative>
  </description>
  <activity-status code="2"/>
  <other-identifier ref="ALT-123" type="A1"/>
</iati-activity>
```

## Notes

- The migration is idempotent and can be run multiple times safely
- Column renames only happen if the old column exists and new doesn't
- The view provides backward compatibility during transition
- All changes are logged during migration execution 