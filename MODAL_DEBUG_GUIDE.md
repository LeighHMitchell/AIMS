# Participating Organization Modal - Debug Guide

## Current Issues

### 1. Organization Role Field Blank
**Symptom:** The "Organization Role" dropdown shows blank even though the table shows the correct role.

**Expected:** Should show "1 Funding", "2 Accountable", "3 Extending", or "4 Implementing"

**Debug Steps:**
1. Open browser console
2. Click "Edit" on an organization
3. Look for these console logs:
   ```
   [OrganisationsSection] Editing org data: {...}
   [ParticipatingOrgModal] Loading editingOrg: {...}
   [ParticipatingOrgModal] Role code: X
   ```

**Check:**
- Is `iati_role_code` a number (1, 2, 3, or 4)?
- Is `role_type` present ('funding', 'government', 'extending', 'implementing')?

**Possible Causes:**
- `iati_role_code` is null or undefined
- `iati_role_code` is a string instead of number
- The value format doesn't match the dropdown options

### 2. Activity ID in Wrong Field
**Symptom:** The XML `activity-id="BB-BBB-123456789-1234"` is showing in "Related Activity IATI Identifier" instead of "Activity ID (Organisation's Own Reference)"

**Root Cause:** Incorrect field mapping in import logic.

**IATI Standard Clarification:**
- `<participating-org @activity-id>` = **Organisation's own activity identifier** → should map to `org_activity_id`
- "Related Activity IATI Identifier" = **A different related activity** → should map to `activity_id_ref`

**Fix Applied:**
Changed import mapping from:
```typescript
activity_id_ref: orgData.activityId || null,  // ❌ WRONG
org_activity_id: null,
```

To:
```typescript
activity_id_ref: null,  // Related activity (not used in basic import)
org_activity_id: orgData.activityId || null,  // ✅ CORRECT - Organization's own activity ID
```

### 3. Multilingual Narratives Not Showing
**Symptom:** French narrative "Nom de l'agence A" not appearing in modal

**Expected:** Should show in "Multilingual Names" section:
- Language Code: `fr`
- Name: `Nom de l'agence A`

**Debug Steps:**
1. Open browser console
2. Click "Edit" on Agency A
3. Look for:
   ```
   [ParticipatingOrgModal] Narratives array: [...]
   ```

**Check:**
- Is the narratives array populated?
- Is it an array or a string?
- Does it have the correct structure: `[{ lang: 'fr', text: 'Nom de l\'agence A' }]`?

**Possible Causes:**
- `narratives` is null or undefined in the database
- `narratives` wasn't parsed from JSONB correctly
- `narratives` wasn't passed from `OrganisationsSection` to modal

## Field Mapping Reference

### XML → Database → Modal

| XML Attribute | Database Column | Modal Field Label |
|--------------|-----------------|-------------------|
| `@ref` | `iati_org_ref` | (not shown, internal) |
| `@role` | `iati_role_code` | **Organization Role** |
| `@type` | `org_type` | (not shown, internal) |
| `@activity-id` | `org_activity_id` | **Activity ID (Organisation's Own Reference)** |
| `@crs-channel-code` | `crs_channel_code` | **CRS Channel Code** |
| `<narrative>` | `narrative` | (primary name, not shown in advanced) |
| `<narrative xml:lang="fr">` | `narratives` JSONB | **Multilingual Names** |

### Example Data Flow

**XML:**
```xml
<participating-org ref="AA-AAA-123456789" role="3" type="21" activity-id="AA-AAA-123456789-1234" crs-channel-code="21000">
  <narrative>Name of Agency A</narrative>
  <narrative xml:lang="fr">Nom de l'agence A</narrative>
</participating-org>
```

**Database:**
```sql
iati_role_code: 3
org_activity_id: 'AA-AAA-123456789-1234'
crs_channel_code: '21000'
narrative: 'Name of Agency A'
narratives: '[{"lang":"fr","text":"Nom de l\'agence A"}]'
```

**Modal Display:**
```
Organization Role: 3 Extending
Activity ID (Organisation's Own Reference): AA-AAA-123456789-1234
CRS Channel Code: 21000 International NGO
Multilingual Names:
  - Language Code: fr
  - Name: Nom de l'agence A
```

## Testing Commands

### 1. Check Database Values
```sql
SELECT 
  narrative,
  iati_role_code,
  org_activity_id,
  activity_id_ref,
  crs_channel_code,
  narratives
FROM activity_participating_organizations
WHERE activity_id = 'YOUR_ACTIVITY_ID'
ORDER BY created_at DESC;
```

### 2. Check API Response
Open browser console and run:
```javascript
fetch('/api/activities/YOUR_ACTIVITY_ID/participating-organizations')
  .then(r => r.json())
  .then(data => console.log('API Response:', data));
```

### 3. Check What Modal Receives
Already added console.logs in the modal. Look for:
```
[OrganisationsSection] Editing org data: {...}
[ParticipatingOrgModal] Loading editingOrg: {...}
[ParticipatingOrgModal] Narratives array: [...]
[ParticipatingOrgModal] Role code: X
[ParticipatingOrgModal] Activity ID ref: ...
[ParticipatingOrgModal] Org Activity ID: ...
```

## Common Issues & Solutions

### Issue: Role Code is String Instead of Number
**Symptom:** Console shows `Role code: "3"` instead of `Role code: 3`

**Solution:** The API should return it as a number. Check the database column type and API serialization.

### Issue: Narratives is a String
**Symptom:** Console shows `Narratives array: "[{\"lang\":\"fr\",\"text\":\"...\"}]"`

**Solution:** The API GET handler needs to parse JSONB:
```typescript
const processedData = data?.map(org => ({
  ...org,
  narratives: org.narratives ? JSON.parse(org.narratives) : null
})) || [];
```

### Issue: Fields Swapped
**Symptom:** Activity ID showing in wrong field

**Solution:** Check the field mapping in `OrganisationsSection.tsx` `handleEdit`:
```typescript
org_activity_id: org.org_activity_id,  // ✅ Organization's own activity ID
activity_id_ref: org.activity_id_ref,  // ✅ Related activity ID
```

## Next Steps

1. **Refresh Browser** - Clear cache and reload
2. **Check Console** - Look for the debug logs
3. **Verify Database** - Run the SQL query above
4. **Test Import** - Re-import the XML if needed
5. **Report Findings** - Share console logs if issues persist

## Expected Console Output

When you click "Edit" on Agency A, you should see:
```
[OrganisationsSection] Editing org data: {
  id: "...",
  organization_id: "...",
  iati_role_code: 3,
  org_activity_id: "AA-AAA-123456789-1234",
  activity_id_ref: null,
  crs_channel_code: "21000",
  narratives: [{ lang: "fr", text: "Nom de l'agence A" }],
  ...
}

[ParticipatingOrgModal] Loading editingOrg: { ... same data ... }
[ParticipatingOrgModal] Narratives array: [{ lang: "fr", text: "Nom de l'agence A" }]
[ParticipatingOrgModal] Role code: 3
[ParticipatingOrgModal] Activity ID ref: null
[ParticipatingOrgModal] Org Activity ID: AA-AAA-123456789-1234
```

## Files to Check

1. **OrganisationsSection.tsx** - Line 88-105 (`handleEdit` function)
2. **ParticipatingOrgModal.tsx** - Line 66-102 (data loading `useEffect`)
3. **API Route** - `/api/activities/[id]/participating-organizations/route.ts` (GET handler)
4. **Database** - `activity_participating_organizations` table

## Important Notes

- The import has been fixed to map `@activity-id` to `org_activity_id` (not `activity_id_ref`)
- You may need to **re-import the XML** for existing organizations to get the correct mapping
- Or manually update the database to move values from `activity_id_ref` to `org_activity_id`
