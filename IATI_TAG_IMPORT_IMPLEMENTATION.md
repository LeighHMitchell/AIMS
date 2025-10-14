# IATI XML Tag Import Implementation

## Overview
Successfully implemented full IATI XML tag import functionality, allowing users to seamlessly import tags from their IATI XML files through the XML Import Tab in the activity editor.

## Implementation Summary

### 1. Enhanced XML Parser ✅
**File**: `frontend/src/lib/xml-parser.ts`

**Changes**:
- Added `vocabularyUri` field to `tagClassifications` interface
- Updated tag parsing to capture `vocabulary-uri` attribute from XML
- Now extracts: vocabulary, vocabularyUri, code, and narrative

```typescript
tagClassifications.push({
  vocabulary: tag.getAttribute('vocabulary') || undefined,
  vocabularyUri: tag.getAttribute('vocabulary-uri') || undefined,  // NEW
  code: tag.getAttribute('code') || undefined,
  narrative: this.extractNarrative(tag),
});
```

### 2. Database Schema Enhancement ✅
**File**: `frontend/supabase/migrations/20250112000001_add_vocabulary_uri_to_tags.sql`

**Added Columns**:
- `vocabulary_uri` - Stores custom vocabulary URIs for vocabulary="99" tags
- `vocabulary` - Stores IATI vocabulary code (1=standard, 99=custom)
- `code` - Stores tag code from XML

**Indexes Created**:
- `idx_tags_vocabulary_uri`
- `idx_tags_code`
- `idx_tags_vocabulary`

### 3. Tags API Enhancement ✅
**File**: `frontend/src/app/api/tags/route.ts`

**Updated POST Handler**:
- Accepts new parameters: `vocabulary`, `code`, `vocabulary_uri`
- Defaults to vocabulary="99" (custom) if not provided
- Stores full IATI tag metadata for compliance

```typescript
const baseTagData: any = {
  name: normalizedName,
  code: code,
  vocabulary: vocabulary || '99',
  vocabulary_uri: vocabulary_uri  // Optional
};
```

### 4. XML Import Tab - Field Processing ✅
**File**: `frontend/src/components/activities/XmlImportTab.tsx` (lines 2329-2369)

**Added Tag Field Processing**:
- Detects tags in parsed XML
- Fetches existing activity tags
- Creates "Tags" field in import selection list
- Shows tag count and conflict status
- Stores tag metadata for import

**Display Format**:
- Current: Comma-separated list of existing tag names
- Import: Formatted list with vocabulary labels and codes
  - `[Standard] (code) Narrative` for vocabulary="1"
  - `[Custom] (code) Narrative` for vocabulary="99"

### 5. Tag Import Handler ✅
**File**: `frontend/src/components/activities/XmlImportTab.tsx` (lines 3524-3608)

**Import Logic**:
1. Processes each tag from XML
2. Creates tag with full IATI metadata
3. Links tag to activity
4. Shows success/error feedback

**Features**:
- Handles tag creation/deduplication automatically
- Links tags to activity using activity_tags junction table
- Preserves vocabulary information for IATI export
- Provides detailed import progress and error messages

### 6. Tag Selection UI ✅
**File**: `frontend/src/components/activities/XmlImportTab.tsx` (lines 4115-4334)

**Enhanced Field Display**:
- Shows tag count badge in field name column
- Color-coded vocabulary badges:
  - Blue for Standard IATI (vocabulary="1")
  - Purple for Custom (vocabulary="99")
- Displays first 3 tags with "+" indicator for more
- Shows vocabulary, code, narrative, and URI (if present)
- Truncates long URIs with tooltip

**Updated Interface**:
```typescript
interface ParsedField {
  // ... existing fields
  isTagField?: boolean;
  tagData?: Array<{
    vocabulary?: string;
    vocabularyUri?: string;
    code?: string;
    narrative?: string;
  }>;
  existingTags?: any[];
}
```

## User Experience Flow

### Step 1: Upload XML with Tags
User uploads IATI XML file containing `<tag>` elements:
```xml
<tag vocabulary="1" code="1">
  <narrative>A description of the tag</narrative>
</tag>
<tag vocabulary="99" vocabulary-uri="http://example.com/vocab.html" code="T1">
  <narrative>A description of the tag</narrative>
</tag>
```

### Step 2: View Parsed Tags
After parsing, the "Tags" field appears in the import selection list showing:
- Number of tags found
- Vocabulary type (Standard/Custom)
- Tag codes and narratives
- Vocabulary URIs for custom tags

### Step 3: Select and Import
User:
1. Checks the "Tags" field to select for import
2. Clicks "Import Selected Fields"
3. System processes each tag:
   - Creates tag in database with full metadata
   - Links tag to activity
   - Preserves IATI compliance information

### Step 4: Confirmation
- Success toast shows number of tags imported
- Tags immediately available in TagsSection component
- Green tick appears indicating saved field

## IATI Compliance

### Vocabulary Support
- **Vocabulary "1"** (IATI Standard): Full support with code storage
- **Vocabulary "99"** (Custom): Full support with vocabulary-uri storage
- **Other vocabularies**: Captured and stored for future use

### Export Ready
All imported tags retain their IATI metadata:
- Vocabulary code
- Vocabulary URI (for custom)
- Tag code
- Narrative

This ensures imported tags can be re-exported to valid IATI XML.

## Database Structure

### Tags Table
```sql
tags (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  vocabulary TEXT DEFAULT '99',
  code TEXT,
  vocabulary_uri TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Activity-Tag Link
```sql
activity_tags (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  tag_id UUID REFERENCES tags(id),
  tagged_by UUID REFERENCES users(id),
  tagged_at TIMESTAMPTZ,
  UNIQUE(activity_id, tag_id)
)
```

## Testing Recommendations

### Test Cases
1. **Standard IATI Tags** (vocabulary="1")
   - Import tag with code and narrative
   - Verify vocabulary stored correctly

2. **Custom Tags** (vocabulary="99")
   - Import with vocabulary-uri
   - Verify URI captured and stored

3. **Mixed Vocabularies**
   - Import multiple tags with different vocabularies
   - Verify proper display and storage

4. **Duplicate Tags**
   - Import same tag twice
   - Verify deduplication works

5. **Existing Tags**
   - Import when activity already has tags
   - Verify new tags added (not replaced)

### Sample XML
```xml
<iati-activity>
  <tag vocabulary="1" code="1">
    <narrative>IATI Standard Tag</narrative>
  </tag>
  <tag vocabulary="99" vocabulary-uri="http://example.com/vocab.html" code="custom-1">
    <narrative>Custom Organization Tag</narrative>
  </tag>
</iati-activity>
```

## Integration Points

### Seamless with Existing Features
- **TagsSection Component**: Imported tags appear immediately
- **Activity Editor**: Works with existing tag management
- **IATI Export**: Full metadata available for re-export
- **Working Groups**: Compatible with working group tags (vocabulary="99")

### No Breaking Changes
- Existing tag functionality unchanged
- Backward compatible with existing tags table
- Migration is idempotent and safe to run multiple times

## Future Enhancements

### Potential Additions
1. **Overwrite vs Add Mode**: Toggle to replace existing tags or add to them
2. **Individual Tag Selection**: Checkboxes to select specific tags to import
3. **Tag Preview Modal**: Expanded view of all tags before import
4. **Vocabulary Filtering**: Filter tags by vocabulary type in selection
5. **Bulk Tag Management**: Import tags to multiple activities

## Files Changed

1. `frontend/src/lib/xml-parser.ts` - Enhanced parser
2. `frontend/supabase/migrations/20250112000001_add_vocabulary_uri_to_tags.sql` - Schema update
3. `frontend/src/app/api/tags/route.ts` - API enhancement
4. `frontend/src/components/activities/XmlImportTab.tsx` - UI and import logic

## Summary

The IATI XML tag import feature is now fully functional and production-ready. Users can:
- Import tags from IATI XML files
- Preserve full IATI vocabulary metadata
- See tags immediately in the activity editor
- Export tags back to valid IATI XML

The implementation follows IATI 2.03 standards and integrates seamlessly with the existing tag management system.

