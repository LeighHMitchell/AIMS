# Participating Organization - Complete Fix Summary

## Issues Reported & Status

| Issue | Status | Solution |
|-------|--------|----------|
| 1. Organization Role blank in modal | ✅ **FIXED** | Changed value prop from formatted string to code |
| 2. Activity ID in wrong field | ✅ **FIXED** | Remapped @activity-id to org_activity_id |
| 3. Multilingual narratives not showing | ⚠️ **NEEDS TESTING** | Parser fixed, may need re-import |

---

## Issue 1: Organization Role Blank ✅ FIXED

### Problem
The "Organization Role" dropdown showed blank even though the table displayed "Extending" badge correctly.

### Root Cause
**Value Mismatch**: We were passing `"3 Extending"` but the component expected just `"3"`.

The `EnhancedSearchableSelect` matches by code:
```typescript
const selectedOption = allOptions.find(opt => opt.code === value);
```

### Solution
```typescript
// Before (WRONG)
value={`${formData.iati_role_code} ${getOrganizationRoleName(formData.iati_role_code)}`}

// After (CORRECT)
value={formData.iati_role_code ? String(formData.iati_role_code) : ''}
```

### Files Modified
- `ParticipatingOrgModal.tsx` - Line 267: Fixed value prop
- `ParticipatingOrgModal.tsx` - Line 144-165: Updated handleRoleChange

### Test
1. Refresh browser
2. Click "Edit" on Agency A
3. Should show "3 Extending" in dropdown ✅

---

## Issue 2: Activity ID in Wrong Field ✅ FIXED

### Problem
The XML `@activity-id` attribute was showing in "Related Activity IATI Identifier" field instead of "Activity ID (Organisation's Own Reference)" field.

### Root Cause
**Incorrect Field Mapping**: The import logic was mapping `@activity-id` to `activity_id_ref` instead of `org_activity_id`.

### IATI Standard Clarification
- `<participating-org @activity-id>` = **Organization's own activity identifier** → `org_activity_id`
- "Related Activity IATI Identifier" = **A different related activity** → `activity_id_ref`

### Solution
Updated import mapping in `XmlImportTab.tsx`:
```typescript
// Before (WRONG)
activity_id_ref: orgData.activityId || null,
org_activity_id: null,

// After (CORRECT)
activity_id_ref: null,  // Related activity (not used in basic import)
org_activity_id: orgData.activityId || null,  // Organization's own activity ID
```

### Files Modified
- `XmlImportTab.tsx` - Line 3415-3420: Fixed field mapping

### Fix Existing Data
Run this SQL script in Supabase:
```sql
-- frontend/sql/fix_activity_id_mapping.sql
UPDATE activity_participating_organizations
SET 
    org_activity_id = activity_id_ref,
    activity_id_ref = NULL
WHERE activity_id_ref IS NOT NULL
AND org_activity_id IS NULL;
```

### Test
1. Run SQL fix for existing data
2. Or re-import XML (future imports will be correct)
3. Click "Edit" on Agency A
4. "Activity ID (Organisation's Own Reference)" should show: `AA-AAA-123456789-1234` ✅
5. "Related Activity IATI Identifier" should be empty ✅

---

## Issue 3: Multilingual Narratives Not Showing ⚠️ NEEDS TESTING

### Problem
The French narrative `<narrative xml:lang="fr">Nom de l'agence A</narrative>` is not appearing in the modal's "Multilingual Names" section.

### Expected Behavior
When editing Agency A, the modal should show:
```
Multilingual Names:
  Language Code: fr
  Name: Nom de l'agence A
```

### Fixes Applied

#### 1. Snippet Parser ✅
Updated to extract all narratives with `xml:lang` attributes:
```typescript
// Extract all narratives with language codes
const narrativesArray = ensureArray(xmlOrg.narrative);
const narratives: Array<{ lang: string; text: string }> = [];

for (const narrative of narrativesArray) {
  const text = typeof narrative === 'string' ? narrative : (narrative['#text'] || '');
  const lang = typeof narrative === 'object' ? (narrative['@_xml:lang'] || '') : '';
  
  if (text && lang && lang !== 'en') {
    narratives.push({ lang, text });
  }
}
```

#### 2. Import Logic ✅
Updated to pass narratives array:
```typescript
narratives: orgData.narratives || [],
```

#### 3. API Handler ✅
Already handles JSONB serialization/deserialization:
```typescript
// POST: Serialize to JSONB
narratives: narratives ? JSON.stringify(narratives) : null

// GET: Parse from JSONB
narratives: org.narratives ? JSON.parse(org.narratives) : null
```

#### 4. OrganisationsSection ✅
Updated to pass narratives to modal:
```typescript
narratives: org.narratives || [],
```

#### 5. Modal Display ✅
Already has UI to display narratives with add/remove functionality.

### Diagnostic Steps

#### Step 1: Check Database
Run in Supabase SQL Editor:
```sql
-- frontend/sql/check_narratives_data.sql
SELECT 
    narrative,
    narratives,
    jsonb_pretty(narratives) as "Formatted"
FROM activity_participating_organizations
WHERE narrative LIKE '%Agency A%';
```

**Expected Result:**
```json
narratives: [{"lang":"fr","text":"Nom de l'agence A"}]
```

**Possible Results:**
- `NULL` → Not imported, need to re-import
- `[]` → Empty array, parser issue
- `{}` → Wrong structure, should be array
- `"[...]"` → Double-encoded string, API issue

#### Step 2: Check Browser Console
1. Refresh browser
2. Open DevTools Console
3. Click "Edit" on Agency A
4. Look for:
```
[OrganisationsSection] Editing org data: { narratives: [...] }
[ParticipatingOrgModal] Narratives array: [...]
```

#### Step 3: Check API Response
In browser console:
```javascript
fetch('/api/activities/YOUR_ACTIVITY_ID/participating-organizations')
  .then(r => r.json())
  .then(data => {
    const agencyA = data.find(o => o.narrative?.includes('Agency A'));
    console.log('Agency A narratives:', agencyA?.narratives);
  });
```

### Most Likely Cause

**🎯 Data imported BEFORE parser was fixed**

The existing data was imported with the old parser that didn't extract multilingual narratives. The parser is now fixed, but existing data needs to be re-imported.

### Solution

**Option A: Re-import XML (Recommended)**
1. Delete Agency A, B, C from the activity
2. Go to XML Import tab
3. Paste the XML snippet again
4. Select all organizations
5. Click "Import Selected Fields"
6. Check if French narrative now appears ✅

**Option B: Manual Database Update**
If you have the data elsewhere, you can manually update:
```sql
UPDATE activity_participating_organizations
SET narratives = '[{"lang":"fr","text":"Nom de l''agence A"}]'::jsonb
WHERE narrative = 'Name of Agency A';
```

### Files Modified
- `parse-snippet/route.ts` - Line 218-261: Extract multilingual narratives
- `XmlImportTab.tsx` - Line 2282: Pass narratives array
- `XmlImportTab.tsx` - Line 3419: Include narratives in POST
- `OrganisationsSection.tsx` - Line 101: Pass narratives to modal
- `ParticipatingOrgModal.tsx` - Line 71-73: Handle narratives array

---

## Testing Checklist

### ✅ Organization Role
- [x] Refresh browser
- [ ] Edit Agency A → Should show "3 Extending"
- [ ] Edit Agency B → Should show "1 Funding"
- [ ] Edit Agency C → Should show "2 Accountable"
- [ ] Change role and save → Should persist

### ✅ Activity ID Field
- [ ] Run SQL fix: `fix_activity_id_mapping.sql`
- [ ] Edit Agency A → "Activity ID (Organisation's Own Reference)" = `AA-AAA-123456789-1234`
- [ ] "Related Activity IATI Identifier" = empty
- [ ] Same for Agency B and C

### ⚠️ Multilingual Narratives
- [ ] Run SQL diagnostic: `check_narratives_data.sql`
- [ ] Check what's in database
- [ ] If NULL → Re-import XML
- [ ] Edit Agency A → Expand "Advanced IATI Fields"
- [ ] "Multilingual Names" section should show:
  - Language Code: `fr`
  - Name: `Nom de l'agence A`

---

## Summary of All Changes

### Files Modified
1. **ParticipatingOrgModal.tsx**
   - Fixed role dropdown value prop
   - Updated handleRoleChange
   - Enhanced narratives handling
   - Added debug console logs

2. **XmlImportTab.tsx**
   - Fixed activity_id mapping
   - Pass narratives array in import

3. **OrganisationsSection.tsx**
   - Pass all fields including narratives to modal
   - Added debug console logs

4. **parse-snippet/route.ts**
   - Extract multilingual narratives from XML
   - Build narratives array with lang codes

5. **iati-crs-channel-codes.ts**
   - Added "000000" code as "Not specified"

6. **use-participating-organizations.ts**
   - Updated interface with new fields
   - Pass narratives in POST requests

### SQL Scripts Created
1. **fix_activity_id_mapping.sql** - Fix existing activity_id data
2. **check_narratives_data.sql** - Diagnostic query for narratives
3. **add_advanced_iati_participating_org_fields.sql** - Database schema

### Documentation Created
1. **ROLE_DROPDOWN_FIX.md** - Role dropdown issue explanation
2. **MODAL_DEBUG_GUIDE.md** - Comprehensive debugging guide
3. **PARTICIPATING_ORG_IMPORT_VERIFICATION.md** - Import verification
4. **PARTICIPATING_ORG_MODAL_FIX.md** - Modal data loading fixes
5. **test_narratives_flow.md** - Narratives data flow test

---

## Next Actions

### Immediate (Required)
1. ✅ **Refresh browser** to load new code
2. ⚠️ **Run SQL fix** for activity_id mapping
3. ⚠️ **Check console logs** when editing organizations
4. ⚠️ **Run diagnostic SQL** to check narratives in database

### If Narratives Not Showing
1. **Re-import the XML** (parser is now fixed)
2. **Share console output** for further debugging
3. **Share SQL query results** to see database state

---

## Expected Final State

When you edit Agency A, the modal should show:

```
Organization: Name of Agency A
Organization Role: 3 Extending ✅

[Show Advanced IATI Fields]

Activity ID (Organisation's Own Reference): AA-AAA-123456789-1234 ✅
Related Activity IATI Identifier: (empty) ✅
CRS Channel Code: 000000 Not specified ✅

Multilingual Names:
  Language Code: fr
  Name: Nom de l'agence A ⚠️ (needs testing)

Reporting Organisation:
  Reporting Organisation IATI Identifier: (empty)
  Secondary Reporter: ☐ (unchecked)
```

---

## Support

If issues persist:
1. Share browser console output
2. Share SQL diagnostic query results
3. Share screenshots of the modal
4. I'll help debug further!
