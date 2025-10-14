# Results IATI Comprehensive Integration - Database Migrations

## Overview
Five database migrations created to support full IATI compliance for the Results framework.

## Migrations Created

### 1. Document Links (20250116000001)
**File**: `frontend/supabase/migrations/20250116000001_add_results_document_links.sql`

Creates 4 tables for document attachments:
- `result_document_links` - Documents for results
- `indicator_document_links` - Documents for indicators  
- `baseline_document_links` - Documents for baselines
- `period_document_links` - Documents for periods (target/actual)

**Fields**: id, entity_id, format, url, title (JSONB), description (JSONB), category_code, language_code, document_date, timestamps

**Features**:
- Full RLS policies for security
- Indexes for performance
- Support for link_type (target/actual) in periods

### 2. References (20250116000002)
**File**: `frontend/supabase/migrations/20250116000002_add_results_references.sql`

Creates 2 tables for external vocabulary references:
- `result_references` - References for results
- `indicator_references` - References for indicators (with indicator_uri)

**Fields**: id, entity_id, vocabulary, code, vocabulary_uri, [indicator_uri], timestamps

**Features**:
- Vocabulary indexing for quick lookups
- Full RLS policies
- Support for IATI vocabulary codes

### 3. Dimensions (20250116000003)
**File**: `frontend/supabase/migrations/20250116000003_add_results_dimensions.sql`

Creates 2 tables for disaggregation:
- `baseline_dimensions` - Dimensions for baselines
- `period_dimensions` - Dimensions for periods (target/actual)

**Fields**: id, entity_id, [dimension_type], name, value, timestamps

**Features**:
- Unique constraints to prevent duplicates
- Support for dimension_type (target/actual) in periods
- Common dimensions: sex, age, disability, geographic, status

### 4. Location References (20250116000004)
**File**: `frontend/supabase/migrations/20250116000004_add_results_locations.sql`

Creates 2 tables for geographic references:
- `baseline_locations` - Locations for baselines
- `period_locations` - Locations for periods (target/actual)

**Fields**: id, entity_id, [location_type], location_ref, timestamps

**Features**:
- Unique constraints per location ref
- Support for location_type (target/actual) in periods
- Indexed for quick geographic queries

### 5. Comment Field Updates (20250116000005)
**File**: `frontend/supabase/migrations/20250116000005_update_comment_fields.sql`

Updates comment fields for multilingual support:
- Converts `indicator_baselines.comment` to JSONB
- Splits `indicator_periods.target_comment` into separate target/actual JSONB fields
- Adds `indicator_periods.actual_comment` as new JSONB field

**Migration Strategy**:
- Safe migration with existing data preservation
- Converts text to JSONB format: `{"en": "text"}`
- Handles NULL and empty string cases

## Security

All tables include:
- Row Level Security (RLS) enabled
- SELECT policies: View access based on activity permissions
- INSERT policies: Write access based on activity edit permissions  
- UPDATE policies: Update access for related entities
- DELETE policies: Delete own records only

## Performance

Indexes created on:
- All foreign key relationships
- Type/category fields for filtering
- Common query patterns

## Next Steps

1. Apply migrations in Supabase SQL Editor in order
2. Verify tables created successfully
3. Test RLS policies
4. Proceed with API route development

## Notes

- All new fields are optional for backward compatibility
- Multilingual support using JSONB format
- Follows IATI 2.03 standard specifications
- Ready for XML import/export integration

