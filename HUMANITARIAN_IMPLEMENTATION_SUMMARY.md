# Humanitarian Activity Support - Implementation Summary

## Overview
Successfully implemented IATI-compliant humanitarian activity reporting with:
- Simple boolean `humanitarian` flag at activity level
- Multiple humanitarian-scope entries with full IATI compliance
- New "Humanitarian" tab in Activity Overview section
- Complete XML import/export support

## Visual Design

The humanitarian tab features a **distinctive red color scheme** to make it immediately recognizable:
- **Red card background** (border-red-200, bg-red-50/50)
- **Red switch** (bg-red-600 when active, bg-red-200 when inactive)
- **Red heart icon** (filled, text-red-500)
- **Red text labels** (text-red-900 for titles, text-red-700 for descriptions)

This matches the humanitarian indicator styling used in the transaction modal, creating visual consistency across the application.

## Files Created

### Database Migrations
1. **`frontend/supabase/migrations/20250117000000_add_humanitarian_to_activities.sql`**
   - Adds `humanitarian BOOLEAN` column to activities table
   - Follows IATI standard for marking activities as wholly or partially humanitarian

2. **`frontend/supabase/migrations/20250117000001_create_humanitarian_scope.sql`**
   - Creates `humanitarian_scope` table for tracking emergencies/appeals
   - Creates `humanitarian_scope_narratives` table for multilingual descriptions
   - Supports type (1=Emergency, 2=Appeal), vocabulary (GLIDE/HRP/Custom), codes, and URIs

### TypeScript Types
3. **`frontend/src/types/humanitarian.ts`**
   - Defines `HumanitarianScope` interface
   - Defines `HumanitarianScopeNarrative` interface
   - Defines `HumanitarianData` interface

### Data & Codelists
4. **`frontend/src/data/humanitarian-codelists.ts`**
   - IATI-compliant scope types (Emergency, Appeal)
   - IATI-compliant vocabularies (GLIDE, HRP, Custom)
   - Helper functions for validation and display

### API Routes
5. **`frontend/src/app/api/activities/[id]/humanitarian/route.ts`**
   - GET endpoint: Fetches humanitarian flag and scopes with narratives
   - POST endpoint: Saves humanitarian data with transactional integrity
   - Properly handles cascading deletes and narrative updates
   - Uses `getSupabaseAdmin()` from `@/lib/supabase` (project standard)

### UI Components
6. **`frontend/src/components/activities/HumanitarianTab.tsx`**
   - Red card styling for humanitarian toggle (matches transaction modal)
   - Toggle switch with red theme (red-600 when checked, red-200 when unchecked)
   - Heart icon visual indicator
   - Table view for multiple humanitarian scopes
   - Add/Edit/Delete functionality for scopes
   - Multilingual narrative support with searchable language selector
   - Searchable vocabulary selector with URLs
   - Help text tooltips with IATI guidance
   - Autosave functionality

7. **`frontend/src/components/forms/HumanitarianVocabularySelect.tsx`**
   - Searchable combobox for vocabulary selection
   - Shows code, name, description, and clickable URL
   - Styled like CollaborationTypeSelect for consistency
   - IATI-compliant vocabulary options (GLIDE, HRP, Custom)

8. **`frontend/src/components/forms/LanguageSelect.tsx`**
   - Searchable combobox for language selection
   - Format: "EN - English" for clarity
   - 25 common languages for development/humanitarian work
   - ISO 639-1 language codes

9. **`frontend/src/data/language-codes.ts`**
   - ISO 639-1 language code definitions
   - Helper functions for formatting language display
   - 25 common languages used in humanitarian/development work

## Files Modified

### Navigation
10. **`frontend/src/components/ActivityEditorNavigation.tsx`**
    - Added "Humanitarian" tab to Activity Overview section
    - Positioned between "Sectors" and "Locations"

### Activity Editor
11. **`frontend/src/app/activities/new/page.tsx`**
    - Imported HumanitarianTab component
    - Added humanitarian section case in render switch
    - Added humanitarian skeleton for loading states

### Data Updates
12. **`frontend/src/data/humanitarian-codelists.ts`**
    - Updated vocabulary URLs to match official IATI sources
    - Glide: http://glidenumber.net/glide/public/search/search.jsp
    - Humanitarian Plan: https://fts.unocha.org/plan-code-list-iati

### XML Parser
13. **`frontend/src/lib/xml-parser.ts`**
   - Updated `ParsedActivity` interface with humanitarian fields
   - Parses `iati-activity/@humanitarian` attribute
   - Parses `humanitarian-scope` elements with type, vocabulary, code, vocabulary-uri
   - Extracts multilingual narratives with xml:lang attributes

### XML Export
14. **`frontend/src/lib/iati-export.ts`**
    - Adds `humanitarian="1"` attribute to `<iati-activity>` when flag is true
    - Generates `<humanitarian-scope>` elements with all attributes
    - Outputs multilingual narratives with proper xml:lang attributes
    - Follows IATI 2.03 standard format

## How to Test

### 1. Run Database Migrations
```bash
cd frontend/supabase
# Apply migrations to your Supabase database
# You can run these directly in the Supabase SQL Editor
```

### 2. Test Manual Entry
1. Navigate to Activity Editor (new or existing activity)
2. Click on "Humanitarian" tab in Activity Overview section
3. Toggle "Is this activity humanitarian?" switch
4. Click "Add Scope" to add a humanitarian scope:
   - Select Type: Emergency or Appeal
   - Select Vocabulary: GLIDE, HRP, or Custom
   - Enter Code (e.g., EQ-2015-000048-NPL for Nepal earthquake)
   - Add narrative descriptions in multiple languages
5. Save and verify data persists on page reload

### 3. Test XML Import
Create a test XML file with humanitarian data:
```xml
<iati-activity humanitarian="1">
  <humanitarian-scope type="1" vocabulary="1-2" code="EQ-2015-000048-NPL">
    <narrative>Nepal Earthquake April 2015</narrative>
    <narrative xml:lang="fr">Népal Earthquake Avril 2015</narrative>
  </humanitarian-scope>
  <humanitarian-scope type="2" vocabulary="2-1" code="FNPL15">
    <narrative>Nepal Flash Appeal 2015</narrative>
  </humanitarian-scope>
</iati-activity>
```

Import steps:
1. Go to Activity Editor → XML Import tab
2. Paste XML snippet
3. Import activity
4. Navigate to Humanitarian tab
5. Verify flag is checked and both scopes are present

### 4. Test XML Export
1. Create an activity with humanitarian flag and scopes
2. Export activity as IATI XML
3. Verify output includes:
   - `humanitarian="1"` attribute on iati-activity element
   - `<humanitarian-scope>` elements with correct attributes
   - Multilingual narratives with xml:lang attributes

## IATI Compliance

This implementation follows IATI Standard v2.03 guidance:
- **Humanitarian Flag**: Binary indicator (1/0) at activity level
- **Humanitarian Scope**: Links activities to specific emergencies (GLIDE) or appeals (HRP)
- **Vocabularies**:
  - 1-2: GLIDE codes for emergencies (http://glidenumber.net)
  - 2-1: UN OCHA Humanitarian Response Plans
  - 99: Custom/reporting organization codes
- **Multilingual Support**: Multiple narratives per scope with language codes

Reference: https://iatistandard.org/en/guidance/standard-guidance/humanitarian/

## Database Schema

### activities table
- `humanitarian` (BOOLEAN, default: false)

### humanitarian_scope table
- `id` (UUID, primary key)
- `activity_id` (UUID, foreign key → activities.id, CASCADE delete)
- `type` (VARCHAR, CHECK: '1' or '2')
- `vocabulary` (VARCHAR)
- `code` (VARCHAR)
- `vocabulary_uri` (TEXT, nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### humanitarian_scope_narratives table
- `id` (UUID, primary key)
- `humanitarian_scope_id` (UUID, foreign key → humanitarian_scope.id, CASCADE delete)
- `language` (VARCHAR, default: 'en')
- `narrative` (TEXT)
- `created_at` (TIMESTAMPTZ)

## Known Limitations

1. The humanitarian flag is activity-wide. For mixed activities (partially humanitarian, partially development), use sector-level or transaction-level humanitarian markers
2. Custom vocabularies (code 99) require vocabulary_uri for proper IATI compliance
3. The UI currently supports manual entry and XML import; bulk import not yet implemented

## Future Enhancements

1. Display humanitarian flag in activity list/card views
2. Add humanitarian filter to activity search
3. Show humanitarian scope details on activity profile page
4. Generate humanitarian statistics in analytics dashboard
5. Validate GLIDE codes and HRP plan codes against external APIs
6. Support transaction-level humanitarian markers (already exists in database)

## Maintenance Notes

- Keep `humanitarian-codelists.ts` updated with new IATI vocabulary codes
- Update help text if IATI guidance changes
- Monitor GLIDE (glidenumber.net) and UN OCHA FTS for vocabulary updates
- Consider adding vocabulary validation/lookup services

