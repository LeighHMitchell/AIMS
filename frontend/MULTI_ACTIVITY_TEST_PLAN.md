# Multi-Activity IATI Import - Comprehensive Test Plan

## Test Environment Setup

### Prerequisites
- Development server running: `cd frontend && npm run dev`
- Access to Activity Editor at `/activities/[id]`
- Test IATI XML files available (see Test Data section)

### Test Data Files

#### 1. Multi-Activity File (Burma USAID)
**URL:** `https://s3.amazonaws.com/files.explorer.devtechlab.com/iati-activities-Burma.xml`
**Expected:** Multiple activities (10+)
**Use For:** Testing multi-activity detection and bulk import

#### 2. World Bank Activity
**IATI ID:** `44000-P156634`
**URL:** `https://d-portal.iatistandard.org/q.xml?aid=44000-P156634`
**Use For:** Testing IATI Search with numeric org codes

#### 3. Single Activity File
**Create manually or use any single `<iati-activity>` element**
**Use For:** Testing backward compatibility

---

## Test Suite 1: Core Parser Functionality

### Test 1.1: Multi-Activity Detection
**Objective:** Verify parser correctly counts activities

**Steps:**
1. Open browser console (F12)
2. Navigate to any activity in Activity Editor
3. Go to "XML Import" tab
4. Choose "From URL"
5. Paste: `https://s3.amazonaws.com/files.explorer.devtechlab.com/iati-activities-Burma.xml`
6. Click "Parse"

**Expected Results:**
- ✅ Console shows: `[Multi-Activity] Detected X activities in XML` (where X > 1)
- ✅ Console shows: `[Multi-Activity] Multiple activities detected, showing preview modal`
- ✅ Preview modal appears with activity cards
- ✅ Statistics bar shows correct total count

**Pass Criteria:** No validation errors, preview modal appears

---

### Test 1.2: Activity Metadata Extraction
**Objective:** Verify metadata is correctly extracted for preview

**Steps:**
1. After parsing (from Test 1.1), examine the activity cards in preview
2. For each activity card, verify:

**Expected Results:**
- ✅ IATI Identifier displayed (e.g., "US-GOV-1-00021MO000343")
- ✅ Title displayed (even if redacted)
- ✅ Organization name shown
- ✅ Dates displayed (if available)
- ✅ Budget amount shown (if available)
- ✅ Transaction count accurate
- ✅ "Already Exists" or "New" badge visible

**Pass Criteria:** All metadata fields populate correctly

---

### Test 1.3: Parse Activity By Index
**Objective:** Verify selective parsing works

**Steps:**
1. In preview modal, select ONE activity (checkbox)
2. Choose "Update Current Activity" mode
3. Click "Import Selected"
4. Wait for field selection UI

**Expected Results:**
- ✅ Console shows: `[Multi-Activity Import] Update current mode - parsing activity at index X`
- ✅ Console shows: `[Multi-Activity Import] Parsed selected activity:` with details
- ✅ Field selection UI appears with data from selected activity only
- ✅ No data from other activities is shown

**Pass Criteria:** Only selected activity's data is imported

---

## Test Suite 2: Database Lookup Service

### Test 2.1: Existing Activity Detection
**Objective:** Verify conflict detection works

**Steps:**
1. Import an activity with IATI ID "TEST-ACTIVITY-001"
2. Create a new XML file with the same IATI ID
3. Parse the file in XML Import tab

**Expected Results:**
- ✅ Console shows: `[Multi-Activity] Checked existing activities: 1 found`
- ✅ Activity card shows "Already Exists" badge (orange/yellow)
- ✅ Statistics bar shows: "Existing: 1"

**Pass Criteria:** Existing activities are correctly identified

---

### Test 2.2: New Activity Detection
**Objective:** Verify new activities are correctly identified

**Steps:**
1. Parse Burma USAID file (contains many unique IDs)
2. Check activity cards

**Expected Results:**
- ✅ Most/all activities show "New" badge (green)
- ✅ Statistics bar shows: "New: X" with correct count
- ✅ Filter "New Only" shows only new activities

**Pass Criteria:** New activities correctly identified

---

## Test Suite 3: Multi-Activity Preview Component

### Test 3.1: Activity Cards Display
**Objective:** Verify all UI elements render correctly

**Steps:**
1. Parse multi-activity file
2. Examine preview modal

**Expected Results:**
- ✅ Modal title shows "Multiple Activities Detected (X)"
- ✅ Each activity has checkbox
- ✅ Activity cards show all metadata
- ✅ Status badges visible and color-coded
- ✅ Cards are clickable/expandable (if description exists)

**Pass Criteria:** All visual elements render properly

---

### Test 3.2: Search Functionality
**Objective:** Verify search filters activities

**Steps:**
1. Parse multi-activity file
2. In search box, type a keyword from one activity's title
3. Observe filtered results

**Expected Results:**
- ✅ Only matching activities shown
- ✅ Statistics bar updates to show filtered counts
- ✅ Clear search to see all activities again

**Pass Criteria:** Search accurately filters activities

---

### Test 3.3: Filter by Status
**Objective:** Verify status filters work

**Steps:**
1. Parse file with mix of existing and new activities
2. Click "New Only" button
3. Verify only new activities shown
4. Click "Existing Only"
5. Verify only existing activities shown
6. Click "All"

**Expected Results:**
- ✅ "New Only" shows only activities without "Already Exists" badge
- ✅ "Existing Only" shows only activities with "Already Exists" badge
- ✅ "All" shows all activities
- ✅ Statistics bar reflects current filter

**Pass Criteria:** All filters work correctly

---

### Test 3.4: Bulk Selection Controls
**Objective:** Verify selection controls work

**Steps:**
1. Parse multi-activity file
2. Click "Select All"
3. Verify all checkboxes checked
4. Click "Deselect All"
5. Verify all checkboxes unchecked
6. Click "Select New Only"
7. Verify only new activities checked

**Expected Results:**
- ✅ "Select All" checks all visible activities
- ✅ "Deselect All" unchecks all activities
- ✅ "Select New Only" checks only new activities
- ✅ Selection count updates in real-time
- ✅ "Import Selected (X)" button shows correct count

**Pass Criteria:** All bulk actions work as expected

---

### Test 3.5: Import Mode Selection
**Objective:** Verify import mode controls and validation

**Steps:**
1. Parse multi-activity file
2. Select 0 activities → check all modes disabled
3. Select 1 activity → check which modes are enabled
4. Select 2+ activities → check which modes are enabled

**Expected Results:**

**0 activities selected:**
- ✅ All mode radio buttons disabled or grayed out
- ✅ "Import Selected" button disabled

**1 activity selected:**
- ✅ "Update Current Activity" enabled
- ✅ "Create New Activity" enabled
- ✅ "Bulk Create Activities" enabled

**2+ activities selected:**
- ✅ "Update Current Activity" disabled
- ✅ "Create New Activity" disabled
- ✅ "Bulk Create Activities" enabled

**Pass Criteria:** Mode validation works correctly

---

## Test Suite 4: Import Handlers

### Test 4.1: Update Current Activity Mode
**Objective:** Verify single activity import into current activity

**Steps:**
1. Open an existing activity
2. Go to XML Import tab
3. Parse multi-activity file
4. Select ONE activity
5. Choose "Update Current Activity"
6. Click "Import Selected"
7. Select fields to import
8. Click final "Import" button

**Expected Results:**
- ✅ Preview modal closes
- ✅ Field selection UI appears
- ✅ Only selected activity's fields shown
- ✅ Import completes successfully
- ✅ Current activity updated with selected data
- ✅ Toast notification shows success

**Pass Criteria:** Activity data correctly imported into current activity

---

### Test 4.2: Create New Activity Mode (Single)
**Objective:** Verify creating one new activity

**Steps:**
1. Parse multi-activity file
2. Select ONE activity (preferably new)
3. Choose "Create New Activity"
4. Click "Import Selected"

**Expected Results:**
- ✅ Console shows: `[Multi-Activity Import] Create new mode - single activity`
- ✅ API call to `/api/activities/bulk-import-iati` made
- ✅ New activity created in database
- ✅ Toast shows "Created 1 new activity successfully"
- ✅ Redirects to new activity page after 1.5 seconds

**Pass Criteria:** One new activity created and accessible

---

### Test 4.3: Bulk Create Activities Mode
**Objective:** Verify bulk creation of multiple activities

**Steps:**
1. Parse multi-activity file
2. Select 3-5 NEW activities (not existing)
3. Choose "Bulk Create Activities"
4. Click "Import Selected"
5. Wait for completion

**Expected Results:**
- ✅ Console shows: `[Multi-Activity Import] Bulk create mode - creating X activities`
- ✅ API call to `/api/activities/bulk-import-iati` with multiple indices
- ✅ Multiple activities created in database
- ✅ Toast shows "Created X new activities successfully"
- ✅ Redirects to activities list after 1.5 seconds
- ✅ All selected activities appear in list

**Pass Criteria:** All selected activities created successfully

---

## Test Suite 5: All Import Methods

### Test 5.1: Upload File Method
**Objective:** Verify file upload triggers multi-activity detection

**Steps:**
1. Download Burma USAID file to local computer
2. Go to XML Import tab
3. Click "Upload File" button
4. Select downloaded file
5. Observe behavior

**Expected Results:**
- ✅ File uploads successfully
- ✅ Multi-activity detection triggered
- ✅ Preview modal appears
- ✅ All activities shown correctly

**Pass Criteria:** Multi-activity detection works via file upload

---

### Test 5.2: From URL Method
**Objective:** Verify URL import triggers multi-activity detection

**Steps:**
1. Go to XML Import tab
2. Click "From URL" button
3. Paste: `https://s3.amazonaws.com/files.explorer.devtechlab.com/iati-activities-Burma.xml`
4. Click "Parse" or press Enter

**Expected Results:**
- ✅ URL fetched successfully
- ✅ Multi-activity detection triggered
- ✅ Preview modal appears
- ✅ All activities shown correctly

**Pass Criteria:** Multi-activity detection works via URL import

---

### Test 5.3: Paste Snippet Method
**Objective:** Verify snippet paste triggers multi-activity detection

**Steps:**
1. Go to XML Import tab
2. Click "Paste Snippet" button
3. Copy multi-activity XML content from Burma file
4. Paste into textarea
5. Click "Parse"

**Expected Results:**
- ✅ Snippet parsed successfully
- ✅ If snippet contains multiple activities, preview modal appears
- ✅ All activities shown correctly

**Pass Criteria:** Multi-activity detection works via snippet paste

---

### Test 5.4: IATI Search Method
**Objective:** Verify IATI Search still works (single-activity focused)

**Steps:**
1. Go to XML Import tab
2. Click "IATI Search" button
3. Enter "44000-P156634" in search box
4. Click "Search"

**Expected Results:**
- ✅ Search completes without error
- ✅ Activity found and displayed
- ✅ Click "Select" to import
- ✅ Single activity flow continues (no multi-activity preview)

**Pass Criteria:** IATI Search works for single activities

---

## Test Suite 6: IATI Search Enhancements

### Test 6.1: Search by Numeric IATI ID
**Objective:** Verify World Bank and similar IDs work

**Test Cases:**
| IATI ID | Organization | Expected Result |
|---------|--------------|-----------------|
| 44000-P156634 | World Bank | ✅ Found |
| 46004-P123456 | IDB | ✅ Found or appropriate message |
| GB-GOV-1-12345 | UK Gov | ✅ Found or appropriate message |

**Steps:**
1. For each test case, enter IATI ID in search
2. Verify result

**Expected Results:**
- ✅ Numeric IDs (starting with numbers) work
- ✅ Letter IDs (starting with letters) work
- ✅ Console shows: `[IATI Search API] Detected as IATI ID: true`

**Pass Criteria:** All IATI ID formats recognized

---

### Test 6.2: Search by Activity Title
**Objective:** Verify title search still works

**Steps:**
1. Search for "Health" or "Education"
2. Verify results

**Expected Results:**
- ✅ Multiple activities returned
- ✅ All contain search term in title
- ✅ Console shows: `[IATI Search API] Detected as IATI ID: false`

**Pass Criteria:** Title search works correctly

---

## Test Suite 7: Bulk Import API

### Test 7.1: Single Activity Creation
**Objective:** Verify API creates single activity

**Steps:**
1. Use browser DevTools Network tab
2. Trigger "Create New Activity" mode with 1 selection
3. Monitor API call to `/api/activities/bulk-import-iati`

**Expected Request:**
```json
{
  "xmlContent": "...",
  "activityIndices": [0],
  "createNew": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "created": 1,
  "activityIds": ["uuid-here"],
  "errors": []
}
```

**Pass Criteria:** API creates activity and returns ID

---

### Test 7.2: Bulk Activity Creation
**Objective:** Verify API creates multiple activities

**Steps:**
1. Use browser DevTools Network tab
2. Trigger "Bulk Create" mode with 3 selections
3. Monitor API call

**Expected Request:**
```json
{
  "xmlContent": "...",
  "activityIndices": [0, 2, 5],
  "createNew": true
}
```

**Expected Response:**
```json
{
  "success": true,
  "created": 3,
  "activityIds": ["uuid-1", "uuid-2", "uuid-3"],
  "errors": []
}
```

**Pass Criteria:** API creates all activities and returns all IDs

---

### Test 7.3: Related Data Import
**Objective:** Verify sectors, countries, transactions imported

**Steps:**
1. Create activity via bulk import
2. Open created activity in editor
3. Check tabs: Sectors, Locations, Financial Information

**Expected Results:**
- ✅ Sectors tab shows imported sectors
- ✅ Locations tab shows recipient countries
- ✅ Financial Information tab shows transactions (if in XML)

**Pass Criteria:** All related data successfully imported

---

### Test 7.4: Partial Success Handling
**Objective:** Verify partial failures handled gracefully

**Steps:**
1. Create XML with some invalid activities (missing required fields)
2. Select all activities for bulk import
3. Monitor results

**Expected Response:**
```json
{
  "success": false,
  "created": 2,
  "activityIds": ["uuid-1", "uuid-2"],
  "errors": ["Failed to create activity X: Missing IATI identifier"]
}
```

**Expected Results:**
- ✅ Valid activities still created
- ✅ Errors reported for invalid activities
- ✅ Toast shows partial success message

**Pass Criteria:** Graceful handling of partial failures

---

## Test Suite 8: Error Handling & Edge Cases

### Test 8.1: Empty Selection
**Objective:** Verify error when no activities selected

**Steps:**
1. Parse multi-activity file
2. Don't select any activities
3. Try to click "Import Selected"

**Expected Results:**
- ✅ Button is disabled
- ✅ Cannot proceed without selection

**Pass Criteria:** Prevents empty import attempts

---

### Test 8.2: Large File Handling
**Objective:** Verify performance with 50+ activities

**Steps:**
1. Find/create XML with 50-100 activities
2. Parse file
3. Monitor performance

**Expected Results:**
- ✅ Parser completes in reasonable time (<10 seconds)
- ✅ Preview renders without lag
- ✅ Selection and filtering remain responsive
- ✅ No browser freeze

**Pass Criteria:** Handles large files smoothly

---

### Test 8.3: Invalid XML
**Objective:** Verify error handling for malformed XML

**Steps:**
1. Create/paste invalid XML (unclosed tags, etc.)
2. Try to parse

**Expected Results:**
- ✅ Clear error message shown
- ✅ No crash or white screen
- ✅ User can try again

**Pass Criteria:** Graceful error handling

---

### Test 8.4: Network Errors
**Objective:** Verify handling of network failures

**Steps:**
1. Open DevTools Network tab
2. Enable "Offline" mode
3. Try URL import
4. Observe behavior

**Expected Results:**
- ✅ Error message shown
- ✅ "Failed to fetch" or similar message
- ✅ User can retry when back online

**Pass Criteria:** Network errors handled gracefully

---

### Test 8.5: Single Activity Backward Compatibility
**Objective:** Verify single-activity files still work

**Steps:**
1. Parse file with only ONE `<iati-activity>` element
2. Observe behavior

**Expected Results:**
- ✅ Console shows: `[Multi-Activity] Single activity detected, continuing normal flow`
- ✅ NO preview modal appears
- ✅ Field selection UI appears directly
- ✅ Normal import flow continues

**Pass Criteria:** Single-activity import unchanged

---

## Test Suite 9: UI/UX Verification

### Test 9.1: Modal Responsiveness
**Objective:** Verify modal works on different screen sizes

**Steps:**
1. Test on desktop (1920x1080)
2. Test on tablet size (resize browser to ~768px)
3. Test on mobile size (~375px)

**Expected Results:**
- ✅ Modal adapts to screen size
- ✅ Activity cards stack properly on mobile
- ✅ Buttons remain accessible
- ✅ No horizontal scroll required

**Pass Criteria:** Responsive design works

---

### Test 9.2: Loading States
**Objective:** Verify loading indicators work

**Steps:**
1. Parse large file and observe progress
2. Monitor progress bar and spinners

**Expected Results:**
- ✅ Progress bar shows during upload (10%)
- ✅ Progress bar shows during parsing (40-80%)
- ✅ Spinner shows during database lookups
- ✅ "Importing..." state visible during import

**Pass Criteria:** All loading states visible

---

### Test 9.3: Toast Notifications
**Objective:** Verify all user feedback messages

**Expected Toast Messages:**
- ✅ "Found X activities. Please select which ones to import."
- ✅ "Activity parsed successfully. Please review and select fields to import."
- ✅ "Created 1 new activity successfully"
- ✅ "Created X new activities successfully"
- ✅ Various error messages

**Pass Criteria:** Clear feedback at each step

---

## Test Suite 10: Integration Testing

### Test 10.1: End-to-End: URL Import → Bulk Create
**Objective:** Complete workflow test

**Steps:**
1. Navigate to Activity Editor
2. Go to XML Import tab
3. Click "From URL"
4. Paste Burma USAID URL
5. Wait for parse completion
6. Select 3 new activities
7. Choose "Bulk Create Activities"
8. Click "Import Selected"
9. Wait for completion
10. Navigate to Activities list
11. Verify all 3 activities exist

**Expected Results:**
- ✅ All steps complete without errors
- ✅ All 3 activities created
- ✅ Activities have correct data
- ✅ Redirects work properly

**Pass Criteria:** Complete end-to-end success

---

### Test 10.2: End-to-End: File Upload → Update Current
**Objective:** Update current activity workflow

**Steps:**
1. Open existing activity
2. Go to XML Import tab
3. Upload multi-activity file
4. Select 1 activity matching current activity's purpose
5. Choose "Update Current Activity"
6. Click "Import Selected"
7. Select fields to update
8. Click "Import"
9. Verify activity updated

**Expected Results:**
- ✅ Current activity data updated
- ✅ No new activity created
- ✅ All selected fields imported

**Pass Criteria:** Update workflow works correctly

---

## Test Results Summary Template

### Test Execution Date: _____________

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Multi-Activity Detection | ⬜ Pass ⬜ Fail | |
| 1.2 | Metadata Extraction | ⬜ Pass ⬜ Fail | |
| 1.3 | Parse By Index | ⬜ Pass ⬜ Fail | |
| 2.1 | Existing Activity Detection | ⬜ Pass ⬜ Fail | |
| 2.2 | New Activity Detection | ⬜ Pass ⬜ Fail | |
| 3.1 | Activity Cards Display | ⬜ Pass ⬜ Fail | |
| 3.2 | Search Functionality | ⬜ Pass ⬜ Fail | |
| 3.3 | Filter by Status | ⬜ Pass ⬜ Fail | |
| 3.4 | Bulk Selection Controls | ⬜ Pass ⬜ Fail | |
| 3.5 | Import Mode Selection | ⬜ Pass ⬜ Fail | |
| 4.1 | Update Current Activity | ⬜ Pass ⬜ Fail | |
| 4.2 | Create New Activity | ⬜ Pass ⬜ Fail | |
| 4.3 | Bulk Create Activities | ⬜ Pass ⬜ Fail | |
| 5.1 | Upload File Method | ⬜ Pass ⬜ Fail | |
| 5.2 | From URL Method | ⬜ Pass ⬜ Fail | |
| 5.3 | Paste Snippet Method | ⬜ Pass ⬜ Fail | |
| 5.4 | IATI Search Method | ⬜ Pass ⬜ Fail | |
| 6.1 | Search Numeric IATI ID | ⬜ Pass ⬜ Fail | |
| 6.2 | Search Activity Title | ⬜ Pass ⬜ Fail | |
| 7.1 | Single Activity API | ⬜ Pass ⬜ Fail | |
| 7.2 | Bulk Activity API | ⬜ Pass ⬜ Fail | |
| 7.3 | Related Data Import | ⬜ Pass ⬜ Fail | |
| 7.4 | Partial Success Handling | ⬜ Pass ⬜ Fail | |
| 8.1 | Empty Selection | ⬜ Pass ⬜ Fail | |
| 8.2 | Large File Handling | ⬜ Pass ⬜ Fail | |
| 8.3 | Invalid XML | ⬜ Pass ⬜ Fail | |
| 8.4 | Network Errors | ⬜ Pass ⬜ Fail | |
| 8.5 | Backward Compatibility | ⬜ Pass ⬜ Fail | |
| 9.1 | Modal Responsiveness | ⬜ Pass ⬜ Fail | |
| 9.2 | Loading States | ⬜ Pass ⬜ Fail | |
| 9.3 | Toast Notifications | ⬜ Pass ⬜ Fail | |
| 10.1 | E2E: URL → Bulk Create | ⬜ Pass ⬜ Fail | |
| 10.2 | E2E: File → Update Current | ⬜ Pass ⬜ Fail | |

### Overall Results:
- **Total Tests:** 33
- **Passed:** _____
- **Failed:** _____
- **Pass Rate:** _____%

### Critical Issues Found:
1. _________________________
2. _________________________

### Recommendations:
_________________________










