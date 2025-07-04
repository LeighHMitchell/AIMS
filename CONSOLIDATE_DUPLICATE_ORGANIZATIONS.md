# Consolidating Duplicate Organizations

This guide explains how to identify and consolidate duplicate organizations in your AIMS database.

## Overview

Duplicate organizations can occur due to:
- Data imports from multiple sources
- Manual entry errors
- Variations in organization names or acronyms
- Migration from legacy systems

## Tools Available

### 1. TypeScript Script (Recommended)

The TypeScript script provides an interactive way to identify and consolidate duplicates with safety checks.

#### Running the Script

```bash
# Navigate to the frontend directory
cd frontend

# First, run without confirmation to see what duplicates exist
npm run consolidate-orgs

# Review the output, then run with confirmation to actually consolidate
npm run consolidate-orgs -- --confirm
```

#### What the Script Does

1. **Identifies duplicates based on:**
   - Exact name matches (case-insensitive)
   - Exact acronym matches (case-insensitive)
   - Similar names (85% similarity threshold using Levenshtein distance)

2. **Shows detailed information** for each duplicate group including:
   - Organization IDs, names, and acronyms
   - Creation and update dates
   - Type and country information

3. **Merges organization data** by:
   - Keeping the most complete and recently updated information
   - Preserving the earliest creation date
   - Maintaining all non-null values from duplicate records

4. **Updates all references** in:
   - `activities` table (reporting_org_id)
   - `activity_contributors` table
   - `users` table
   - `user_organizations` table
   - `custom_group_organizations` table

5. **Deletes the duplicate organizations** after consolidation

### 2. SQL Script (Alternative)

For direct database analysis, use the SQL script.

#### Running the SQL Script

```bash
# Connect to your database and run:
psql -d your_database_name -f frontend/sql/identify_duplicate_organizations.sql
```

#### What the SQL Script Provides

1. **Duplicate Analysis:**
   - Lists all duplicate groups with match type and values
   - Shows detailed information for each organization
   - Counts references in other tables

2. **Consolidation Plan:**
   - Recommends which organization to keep as primary
   - Scores organizations based on data completeness
   - Considers activity references and user associations

3. **Optional SQL Generation:**
   - Can generate UPDATE and DELETE statements for manual review
   - Uncomment the last section to see the SQL commands

## Best Practices

1. **Always backup your database** before running consolidation
2. **Review the duplicate analysis** carefully before confirming
3. **Check for special cases** where organizations might have the same name but are actually different entities
4. **Consider timing** - run during low-activity periods to minimize disruption
5. **Communicate changes** to users who might be affected

## Troubleshooting

### Common Issues

1. **"No duplicate organizations found"**
   - This is good! Your database has no duplicates.

2. **Permission errors**
   - Ensure you have appropriate database permissions
   - The consolidation requires UPDATE and DELETE permissions

3. **Foreign key constraints**
   - The script handles known relationships
   - If you have custom tables referencing organizations, update the script accordingly

### Manual Cleanup

If automatic consolidation fails, you can manually consolidate using the SQL script output:

1. Run the SQL analysis script
2. Review the consolidation plan
3. Manually execute the UPDATE statements for each table
4. Delete duplicate organizations after updating references

## Maintenance

To prevent future duplicates:

1. **Implement validation** in the organization creation process
2. **Use the existing duplicate check** in the API
3. **Regularly run the identification script** (without --confirm) to monitor
4. **Consider adding database constraints** for unique names/acronyms if appropriate

## Related Files

- `frontend/scripts/identify-consolidate-duplicate-organizations.ts` - Main consolidation script
- `frontend/sql/identify_duplicate_organizations.sql` - SQL analysis script
- `frontend/src/app/api/organizations/route.ts` - API with duplicate prevention 