# Organisation Type Dropdown Enhancement

## Overview
Enhanced the organization type dropdown in the organization edit/create modal to display both the IATI code and name for better clarity.

## Changes Made

### File Modified
- `frontend/src/app/organizations/page.tsx`

### Enhancement Details

#### Before
- Dropdown showed only the organization type label (e.g., "Government")
- Code was not visible in the selected value

#### After
- **Selected Value**: Shows "10 - Government" format
- **Dropdown Options**: Shows code in a badge + name (e.g., badge "10" + "Government")
- Makes it clear which IATI code corresponds to each organization type

### Visual Example

**When dropdown is closed (selected state):**
```
┌─────────────────────────────────────┐
│ 10 - Government                  ▼ │
└─────────────────────────────────────┘
```

**When dropdown is open:**
```
┌─────────────────────────────────────┐
│ [10] Government                     │
│ [11] Local Government               │
│ [15] Other Public Sector            │
│ [21] International NGO              │
│ [22] National NGO                   │
│ [23] Regional NGO                   │
│ [24] Partner Country based NGO      │
│ [30] Public Private Partnership     │
│ [40] Multilateral                   │
│ [60] Foundation                     │
│ [70] Private Sector                 │
│ [71] Private Sector in Provider Cou │
│ [72] Private Sector in Aid Recipien │
│ [73] Private Sector in Third Country│
│ [80] Academic, Training and Research│
│ [90] Other                          │
└─────────────────────────────────────┘
```

## Benefits

1. **Clarity**: Users can immediately see which IATI code they're selecting
2. **Reference**: Helpful for users familiar with IATI standard codes
3. **Validation**: Easier to verify the correct organization type is selected
4. **Consistency**: Aligns with IATI XML export format where codes are used

## User Experience

- **Creating Organization**: Users see both code and name, making selection more informed
- **Editing Organization**: The selected value clearly shows "code - name" format
- **Searching**: Users can search by either code or name in the future

## Technical Implementation

The SelectValue component now:
1. Checks if a value is selected (`formData.Organisation_Type_Code`)
2. Finds the matching organization type from the `organizationTypes` array
3. Displays: `{code} - {label}` format

The dropdown options display:
- Code in a styled badge (monospace font, muted background)
- Label in regular font weight

## Testing

After deploying, verify:
- [ ] Dropdown shows code - name when closed
- [ ] Dropdown options show badge + name when open
- [ ] Creating new organization saves correct code
- [ ] Editing existing organization displays correct code - name
- [ ] Dropdown is responsive and text doesn't overflow

## Related Files

This enhancement works together with:
- `rename_organisation_type_column.sql` - Database migration
- `ORGANISATION_TYPE_MIGRATION_GUIDE.md` - Migration documentation
- All updated frontend files that reference Organisation_Type_Code

---

**Status**: ✅ Complete  
**Impact**: UI/UX Enhancement  
**Breaking Change**: No

