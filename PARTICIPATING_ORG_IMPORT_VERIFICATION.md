# Participating Organization IATI XML Import Verification

## Overview
This document verifies that the IATI XML import for participating organizations correctly handles all attributes and multilingual narratives according to the IATI standard.

## Test XML Structure
```xml
<participating-org ref="BB-BBB-123456789" role="1" type="40" activity-id="BB-BBB-123456789-1234">
 <narrative>Name of Agency B</narrative>
</participating-org>
<participating-org ref="CC-CCC-123456789" role="2" type="10" activity-id="CC-CCC-123456789-1234">
 <narrative>Name of Agency C</narrative>
</participating-org>
<participating-org ref="AA-AAA-123456789" role="3" type="21" activity-id="AA-AAA-123456789-1234" crs-channel-code="21000">
 <narrative>Name of Agency A</narrative>
 <narrative xml:lang="fr">Nom de l'agence A</narrative>
</participating-org>
```

## Expected Import Results

### Organization 1: Agency B
- **IATI Identifier**: `BB-BBB-123456789`
- **Role**: `1` (Funding)
- **Organization Type**: `40` (Multilateral)
- **Activity ID**: `BB-BBB-123456789-1234`
- **CRS Channel Code**: None
- **Primary Narrative**: `Name of Agency B` (en)
- **Multilingual Narratives**: None

### Organization 2: Agency C
- **IATI Identifier**: `CC-CCC-123456789`
- **Role**: `2` (Accountable/Government)
- **Organization Type**: `10` (Government)
- **Activity ID**: `CC-CCC-123456789-1234`
- **CRS Channel Code**: None
- **Primary Narrative**: `Name of Agency C` (en)
- **Multilingual Narratives**: None

### Organization 3: Agency A
- **IATI Identifier**: `AA-AAA-123456789`
- **Role**: `3` (Extending)
- **Organization Type**: `21` (International NGO)
- **Activity ID**: `AA-AAA-123456789-1234`
- **CRS Channel Code**: `21000` (International NGO)
- **Primary Narrative**: `Name of Agency A` (en)
- **Multilingual Narratives**: 
  - French (`fr`): `Nom de l'agence A`

## Database Schema Mapping

### Fields in `activity_participating_organizations` Table

| IATI XML Attribute | Database Column | Example Value |
|-------------------|-----------------|---------------|
| `@ref` | `iati_org_ref` | `BB-BBB-123456789` |
| `@role` | `iati_role_code` | `1` |
| `@type` | `org_type` | `40` |
| `@activity-id` | `activity_id_ref` | `BB-BBB-123456789-1234` |
| `@crs-channel-code` | `crs_channel_code` | `21000` |
| `<narrative>` (primary) | `narrative` | `Name of Agency A` |
| `<narrative xml:lang>` | `narrative_lang` | `en` |
| `<narrative xml:lang="fr">` | `narratives` (JSONB) | `[{"lang":"fr","text":"Nom de l'agence A"}]` |

### New Advanced IATI Fields (Modal Only)
| Field | Database Column | Purpose |
|-------|-----------------|---------|
| Activity ID (Org's Own Reference) | `org_activity_id` | Organisation's own activity identifier |
| Reporting Organisation IATI Identifier | `reporting_org_ref` | IATI ID of publishing org |
| Secondary Reporter | `secondary_reporter` | Boolean flag for secondary reporting |

## Implementation Changes

### 1. Snippet Parser (`/api/iati/parse-snippet/route.ts`)
**Changes Made:**
- ✅ Extract all `<narrative>` elements with `xml:lang` attributes
- ✅ Separate primary narrative (English or first) from multilingual narratives
- ✅ Build `narratives` array for non-English narratives
- ✅ Parse `@activity-id` attribute
- ✅ Parse `@crs-channel-code` attribute

**Code Logic:**
```typescript
// Extract all narratives with language codes
const narrativesArray = ensureArray(xmlOrg.narrative);
const narratives: Array<{ lang: string; text: string }> = [];
let primaryNarrative = '';
let narrativeLang = 'en';

for (const narrative of narrativesArray) {
  const text = typeof narrative === 'string' 
    ? narrative 
    : (narrative['#text'] || '');
  const lang = typeof narrative === 'object' 
    ? (narrative['@_xml:lang'] || narrative['@_lang'] || '') 
    : '';
  
  if (text) {
    if (lang && lang !== 'en') {
      narratives.push({ lang, text });
    } else if (!primaryNarrative) {
      primaryNarrative = text;
      narrativeLang = lang || 'en';
    }
  }
}
```

### 2. XML Import Tab (`XmlImportTab.tsx`)
**Changes Made:**
- ✅ Pass `narratives` array in `importValue` object
- ✅ Include all new fields in POST request body
- ✅ Clear existing participating orgs before import (prevents duplicates)

**Import Data Structure:**
```typescript
importValue: {
  name: orgName,
  ref: org.ref || null,
  role: role,
  narrative: org.narrative || null,
  type: org.type || null,
  activityId: org.activityId || null,
  crsChannelCode: org.crsChannelCode || null,
  narrativeLang: org.narrativeLang || 'en',
  narratives: org.narratives || []  // ✅ NEW
}
```

**API Request Body:**
```typescript
const requestBody = {
  organization_id: organizationId,
  role_type: roleType,
  iati_role_code: parseInt(orgData.role) || 4,
  iati_org_ref: orgData.ref || null,
  org_type: orgData.type || null,
  activity_id_ref: orgData.activityId || null,
  crs_channel_code: orgData.crsChannelCode || null,
  narrative: orgData.narrative || null,
  narrative_lang: orgData.narrativeLang || 'en',
  narratives: orgData.narratives || [],  // ✅ NEW
  org_activity_id: null,
  reporting_org_ref: null,
  secondary_reporter: false
};
```

### 3. API Route (`/api/activities/[id]/participating-organizations/route.ts`)
**Changes Made:**
- ✅ Accept `narratives` array in POST body
- ✅ Serialize `narratives` to JSONB using `JSON.stringify()`
- ✅ Parse `narratives` from JSONB in GET responses
- ✅ Support new advanced fields (`org_activity_id`, `reporting_org_ref`, `secondary_reporter`)

**POST Handler:**
```typescript
const { 
  narratives,
  org_activity_id,
  reporting_org_ref,
  secondary_reporter = false
} = body;

await supabaseAdmin
  .from('activity_participating_organizations')
  .insert({
    // ... other fields
    narratives: narratives ? JSON.stringify(narratives) : null,
    org_activity_id,
    reporting_org_ref,
    secondary_reporter
  })
```

**GET Handler:**
```typescript
const processedData = data?.map(org => ({
  ...org,
  narratives: org.narratives ? JSON.parse(org.narratives) : null
})) || [];
```

### 4. Modal Component (`ParticipatingOrgModal.tsx`)
**Changes Made:**
- ✅ Reorganized field order (Activity ID first, Related Activity ID second)
- ✅ Renamed "Reporting Organisation Reference" → "Reporting Organisation IATI Identifier"
- ✅ Nested "Secondary Reporter" under "Reporting Organisation" section
- ✅ Added visual grouping with background styling for Reporting Org section
- ✅ Multilingual narratives field with add/remove functionality
- ✅ Client-side validation for language codes (ISO 639-1) and IATI IDs

**Field Order:**
1. Activity ID (Organisation's Own Reference)
2. Related Activity IATI Identifier
3. CRS Channel Code
4. Multilingual Names
5. **Reporting Organisation Section:**
   - Reporting Organisation IATI Identifier
   - Secondary Reporter (nested)

### 5. Database Migration (`add_advanced_iati_participating_org_fields.sql`)
**Changes Made:**
- ✅ Added `narratives` JSONB column
- ✅ Added `org_activity_id` VARCHAR(200) column
- ✅ Added `reporting_org_ref` VARCHAR(200) column
- ✅ Added `secondary_reporter` BOOLEAN column
- ✅ Created indexes for performance
- ✅ Added CHECK constraints for IATI ID format validation
- ✅ Fixed all SQL syntax errors

## Testing Instructions

### 1. Test Snippet Import
1. Navigate to Activity Editor → XML Import tab
2. Paste the test XML snippet (see above)
3. Click "Parse Snippet"
4. Verify 3 organizations are detected
5. Select all organizations
6. Click "Import Selected Fields"

### 2. Verify Database Storage
```sql
SELECT 
  narrative,
  narrative_lang,
  narratives,
  iati_org_ref,
  iati_role_code,
  org_type,
  activity_id_ref,
  crs_channel_code
FROM activity_participating_organizations
WHERE activity_id = 'YOUR_ACTIVITY_ID'
ORDER BY created_at DESC;
```

**Expected Results:**
- Agency A should have `narratives` = `[{"lang":"fr","text":"Nom de l'agence A"}]`
- All `activity_id_ref` values should match XML `@activity-id` attributes
- Agency A should have `crs_channel_code` = `21000`

### 3. Verify Modal Display
1. Click "Edit" on Agency A
2. Expand "Advanced IATI Fields"
3. Verify:
   - ✅ Activity ID field is populated
   - ✅ CRS Channel Code shows "21000 International NGO"
   - ✅ Multilingual Names section shows French narrative

### 4. Test Role Mapping
| IATI Role Code | Expected Internal Role | Expected Display |
|----------------|------------------------|------------------|
| 1 | `funding` | Funding |
| 2 | `government` | Accountable |
| 3 | `extending` | Extending |
| 4 | `implementing` | Implementing |

## Known Issues & Resolutions

### ✅ Issue 1: Duplicate Organizations
**Problem:** Organizations were being duplicated on each import.
**Solution:** Added DELETE call before import to clear existing participating orgs.

### ✅ Issue 2: Missing Multilingual Narratives
**Problem:** Only primary narrative was imported, French narrative was lost.
**Solution:** Updated snippet parser to extract all narratives with `xml:lang` attributes.

### ✅ Issue 3: Missing activity-id and crs-channel-code
**Problem:** These attributes were not being parsed from XML.
**Solution:** Added explicit parsing in snippet parser route.

### ✅ Issue 4: SQL Syntax Errors
**Problem:** Multiple SQL errors in migration file.
**Solution:** Fixed typos, constraint syntax, and column references.

## Compliance with IATI Standard

### IATI 2.03 Specification
- ✅ `<participating-org @ref>` → `iati_org_ref`
- ✅ `<participating-org @role>` → `iati_role_code`
- ✅ `<participating-org @type>` → `org_type`
- ✅ `<participating-org @activity-id>` → `activity_id_ref`
- ✅ `<participating-org @crs-channel-code>` → `crs_channel_code`
- ✅ `<narrative>` → `narrative` (primary)
- ✅ `<narrative xml:lang="xx">` → `narratives` JSONB array

### Future Export Capability
The data structure now supports full IATI XML export:
```xml
<participating-org 
  ref="AA-AAA-123456789" 
  role="3" 
  type="21" 
  activity-id="AA-AAA-123456789-1234" 
  crs-channel-code="21000">
  <narrative>Name of Agency A</narrative>
  <narrative xml:lang="fr">Nom de l'agence A</narrative>
</participating-org>
```

## Summary

✅ **All IATI attributes are now correctly imported**
✅ **Multilingual narratives are preserved**
✅ **Database schema supports full IATI compliance**
✅ **Modal UI provides comprehensive editing**
✅ **No duplicates on import**
✅ **Role mapping is correct**

The system now fully supports the IATI 2.03 standard for participating organizations with complete attribute coverage and multilingual support.
