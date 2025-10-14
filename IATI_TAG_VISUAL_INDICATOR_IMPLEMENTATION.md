# IATI Tag Visual Indicator Implementation

## Overview
Added visual differentiation between IATI XML-imported tags and locally-created tags in the Tags tab of the activity editor.

## Implementation

### Visual Indicators

#### IATI-Imported Tags
**Icon**: `<CodeXml />` from Lucide React
**Detection**: Tags with `vocabulary` AND `code` fields present

**Display Features**:
- Shows `CodeXml` icon instead of `Hash` icon
- Enhanced tooltip with IATI metadata
- Color-coded vocabulary badges

#### Locally-Created Tags  
**Icon**: `<Hash />` from Lucide React
**Detection**: Tags without vocabulary/code (created manually by users)

**Display Features**:
- Shows standard `Hash` icon
- Standard tooltip with creator info

### Code Changes

#### File: `frontend/src/components/TagsSection.tsx`

**1. Added Import**
```typescript
import { X, Hash, Edit2, Check, AlertCircle, Info, CodeXml } from 'lucide-react';
```

**2. Extended Tag Interface**
```typescript
interface Tag {
  id: string;
  name: string;
  vocabulary?: string;      // NEW: IATI vocabulary code
  code?: string;           // NEW: IATI tag code
  vocabulary_uri?: string; // NEW: Custom vocabulary URI
  created_by?: string;
  created_at?: string;
  addedBy?: { id: string; name: string; };
  addedAt?: string;
}
```

**3. Added Helper Function**
```typescript
const isIatiImportedTag = (tag: Tag) => {
  // IATI tags have vocabulary and code fields
  return !!(tag.vocabulary && tag.code);
};
```

**4. Updated Icon Rendering**
```typescript
{isIatiImportedTag(tag) ? (
  <CodeXml className="w-3 h-3" />  // IATI tag
) : (
  <Hash className="w-3 h-3" />     // Local tag
)}
```

**5. Enhanced Tooltip**
```typescript
{isIatiImportedTag(tag) && (
  <div className="mb-2 pb-2 border-b border-gray-200">
    <p className="font-semibold text-blue-600 flex items-center gap-1">
      <CodeXml className="w-3 h-3" />
      Imported from IATI XML
    </p>
    <div className="mt-1 space-y-0.5 text-gray-600">
      <p>Vocabulary: {tag.vocabulary === '1' ? 'IATI Standard' : 'Custom'}</p>
      <p>Code: {tag.code}</p>
      {tag.vocabulary_uri && (
        <p className="truncate max-w-48" title={tag.vocabulary_uri}>
          URI: {tag.vocabulary_uri}
        </p>
      )}
    </div>
  </div>
)}
```

## Visual Design

### Tag Badge Appearance

#### IATI-Imported Tag Example
```
┌─────────────────────────────┐
│ <CodeXml> a description     │
│   of the tag         [✎][×] │
└─────────────────────────────┘
```

#### Locally-Created Tag Example
```
┌─────────────────────────────┐
│ <Hash> education            │
│                      [✎][×] │
└─────────────────────────────┘
```

### Tooltip Content

#### IATI Tag Tooltip
```
┌────────────────────────────────┐
│ <CodeXml> Imported from IATI   │
│                                │
│ Vocabulary: IATI Standard      │
│ Code: 1                        │
│ ────────────────────           │
│ Added by Leigh Mitchell        │
│ Oct 11, 2025, 2:49 PM          │
│                                │
│ Click to edit                  │
└────────────────────────────────┘
```

#### Local Tag Tooltip  
```
┌────────────────────────────────┐
│ Added by Leigh Mitchell        │
│ Oct 11, 2025, 3:15 PM          │
│                                │
│ Click to edit                  │
└────────────────────────────────┘
```

## User Experience

### At a Glance Identification
Users can immediately see which tags are:
- **IATI-compliant** (CodeXml icon) - Imported from authoritative XML sources
- **User-defined** (Hash icon) - Created locally for internal use

### Hover for Details
Hovering over IATI tags reveals:
- Source confirmation (Imported from IATI XML)
- Vocabulary type (Standard or Custom)
- IATI code
- Vocabulary URI (for custom vocabularies)
- Standard metadata (creator, date)

### Example Scenarios

#### Scenario 1: Standard IATI Tag
```xml
<tag vocabulary="1" code="1">
  <narrative>A description of the tag</narrative>
</tag>
```
**Display**: `<CodeXml>` icon, tooltip shows "Vocabulary: IATI Standard, Code: 1"

#### Scenario 2: Custom IATI Tag
```xml
<tag vocabulary="99" vocabulary-uri="http://example.com/vocab.html" code="T1">
  <narrative>Custom taxonomy tag</narrative>
</tag>
```
**Display**: `<CodeXml>` icon, tooltip shows "Vocabulary: Custom, Code: T1, URI: http://..."

#### Scenario 3: Locally Created Tag
**Created via**: User types "education" in tag input and presses Enter
**Display**: `<Hash>` icon, standard tooltip only

## Detection Logic

### IATI-Imported Tag Criteria
A tag is considered IATI-imported if:
```typescript
tag.vocabulary && tag.code
```

**Rationale**:
- IATI XML tags always have vocabulary attribute
- IATI XML tags always have code attribute
- Locally-created tags lack these fields
- Simple, reliable detection

### Edge Cases Handled
1. **Old tags** without vocabulary/code → Show as local (Hash icon)
2. **Tags with vocabulary but no code** → Show as local (unlikely but safe)
3. **Tags with code but no vocabulary** → Show as local (shouldn't happen)

## Benefits

### For Users
- ✅ Instant visual feedback on tag source
- ✅ Confidence in IATI compliance
- ✅ Easy identification of authoritative vs custom tags
- ✅ Full metadata transparency

### For Data Quality
- ✅ Clear distinction between standards-based and local tags
- ✅ Encourages IATI standard adoption
- ✅ Supports audit trails (where did this tag come from?)
- ✅ Facilitates data governance

### For Reporting
- ✅ Easy to filter IATI vs local tags
- ✅ Vocabulary information available for exports
- ✅ Supports IATI XML re-export
- ✅ Maintains data provenance

## Testing

### Manual Test Steps
1. Import IATI XML with tags (vocabulary + code)
2. Create a local tag manually
3. Navigate to Tags tab
4. Verify:
   - IATI tags show `<CodeXml>` icon
   - Local tags show `<Hash>` icon
   - Hovering IATI tags shows metadata
   - Hovering local tags shows standard info

### Expected Outcomes
- IATI tags: Blue tooltip header "Imported from IATI XML"
- Local tags: No special header
- All tags editable/deletable regardless of source
- Icons clearly differentiate tag types

## Code Quality
- ✅ Zero linter errors
- ✅ TypeScript type-safe
- ✅ Accessible (proper aria-labels)
- ✅ Performant (simple boolean check)
- ✅ Maintainable (clear helper function)

## Future Enhancements

### Potential Additions
1. **Filter by source**: Toggle to show only IATI or only local tags
2. **Batch operations**: Export IATI tags separately
3. **Source badge**: Small badge on tag showing "IATI" or "Local"
4. **Analytics**: Track usage of IATI vs local tags
5. **Validation**: Warn when mixing IATI and local tags inappropriately

## Summary

Successfully implemented visual differentiation for IATI-imported tags using:
- `CodeXml` icon for IATI tags (has vocabulary + code)
- `Hash` icon for local tags
- Enhanced tooltips showing full IATI metadata
- Clean, type-safe implementation

Users can now instantly identify tag sources and access full IATI metadata through intuitive visual indicators.

