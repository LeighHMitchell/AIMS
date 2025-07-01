# Testing Contacts Flow

## Issue Summary
Saved contacts aren't appearing in the Activity Editor's contacts tab after saving. The contacts are saving to the database correctly via the API, but they're not showing up in the editor after save.

## Root Cause Analysis

1. **ContactsSection Component**: ✅ Working correctly - handles contact creation, editing, and calls onChange
2. **Activity Edit Page**: ✅ Working correctly - saves contacts and updates local state
3. **API Saving**: ✅ Working correctly - contacts are saved to database
4. **API Fetching**: ❌ **This was the issue** - GET /api/activities didn't include contacts
5. **Activity Detail Page**: ❌ Affected by API issue - couldn't display contacts

## Solution Implemented

### 1. Fixed API GET Method
Modified `/api/activities/route.ts` to include contacts when fetching activities:

- Added contacts fetching: `supabaseAdmin.from('activity_contacts').select('*')`
- Added contacts mapping: `contactsMap`
- Added contacts transformation in response

### 2. Added Debug Logging
Added debugging to:
- ContactsSection component
- Activity detail page 
- Activity edit page after save

## Test Plan

1. **Create Activity with Contacts**:
   - Go to /activities/new
   - Add contacts in Contacts section
   - Save activity
   - Check console logs for contact data

2. **Verify Contacts Display**:
   - Go to activity detail page
   - Check Contacts tab shows saved contacts
   - Check console logs for fetched contact data

3. **Edit Existing Activity**:
   - Edit activity with contacts
   - Add/modify contacts
   - Save and verify contacts persist
   - Check both edit view and detail view

## Expected Behavior
- Contacts saved in editor should appear in both:
  - Activity detail page contacts tab (read-only view)
  - Activity edit page contacts section (editable view)
- Debug logs should show contacts being fetched and displayed correctly