# Document Links Import - Comprehensive Test Plan

## Test Overview
This document provides a comprehensive testing checklist for the activity-level document-link import functionality implemented in the IATI XML parser and import system.

---

## Test Suite 1: XML Parser Tests

### Test 1.1: Basic Document Link Parsing
**Objective:** Verify parser extracts single document-link correctly

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-001</iati-identifier>
  <title><narrative>Test Activity</narrative></title>
  <document-link format="application/pdf" url="https://example.com/doc.pdf">
    <title><narrative xml:lang="en">Project Document</narrative></title>
    <description><narrative xml:lang="en">Main project documentation</narrative></description>
    <category code="A01" />
    <language code="en" />
    <document-date iso-date="2023-06-15" />
  </document-link>
</iati-activity>
```

**Steps:**
1. Open browser console
2. Navigate to Activity Editor → XML Import tab
3. Paste the test XML in snippet mode
4. Click "Parse XML"
5. Check browser console for parser logs

**Expected Results:**
- ✅ Console shows: `[XML Parser] Found 1 activity-level document links`
- ✅ Parsed activity object contains `document_links` array with 1 item
- ✅ Document has:
  - `url: "https://example.com/doc.pdf"`
  - `format: "application/pdf"`
  - `title: "Project Document"`
  - `description: "Main project documentation"`
  - `category_code: "A01"`
  - `language_code: "en"`
  - `document_date: "2023-06-15"`

---

### Test 1.2: Multiple Document Links
**Objective:** Verify parser handles multiple document-links

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-002</iati-identifier>
  <title><narrative>Test Activity</narrative></title>
  <document-link format="application/pdf" url="https://example.com/doc1.pdf">
    <title><narrative>Document 1</narrative></title>
    <category code="A01" />
  </document-link>
  <document-link format="image/jpeg" url="https://example.com/photo.jpg">
    <title><narrative>Project Photo</narrative></title>
    <category code="A08" />
  </document-link>
  <document-link format="application/vnd.ms-excel" url="https://example.com/budget.xlsx">
    <title><narrative>Budget Spreadsheet</narrative></title>
    <category code="A05" />
  </document-link>
</iati-activity>
```

**Expected Results:**
- ✅ Console shows: `[XML Parser] Found 3 activity-level document links`
- ✅ All 3 documents parsed correctly
- ✅ Each has unique URL, format, title, and category

---

### Test 1.3: URL Validation and Fixing
**Objective:** Verify parser fixes malformed URLs

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-003</iati-identifier>
  <title><narrative>Test Activity</narrative></title>
  <document-link format="application/pdf" url="http:example.com/doc.pdf">
    <title><narrative>Malformed HTTP URL</narrative></title>
    <category code="A01" />
  </document-link>
  <document-link format="application/pdf" url="https:example.com/doc2.pdf">
    <title><narrative>Malformed HTTPS URL</narrative></title>
    <category code="A01" />
  </document-link>
</iati-activity>
```

**Expected Results:**
- ✅ First URL fixed to: `http://example.com/doc.pdf`
- ✅ Second URL fixed to: `https://example.com/doc2.pdf`
- ✅ Both documents parsed successfully

---

### Test 1.4: Empty/Missing URL Handling
**Objective:** Verify parser skips documents without valid URLs

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-004</iati-identifier>
  <title><narrative>Test Activity</narrative></title>
  <document-link format="application/pdf" url="">
    <title><narrative>Empty URL</narrative></title>
    <category code="A01" />
  </document-link>
  <document-link format="application/pdf">
    <title><narrative>Missing URL</narrative></title>
    <category code="A01" />
  </document-link>
  <document-link format="application/pdf" url="https://example.com/valid.pdf">
    <title><narrative>Valid Document</narrative></title>
    <category code="A01" />
  </document-link>
</iati-activity>
```

**Expected Results:**
- ✅ Console shows: `[XML Parser] Found 3 activity-level document links` (found)
- ✅ Only 1 document in result array (valid one)
- ✅ Empty and missing URLs are skipped silently

---

### Test 1.5: Minimal Document Link (Required Fields Only)
**Objective:** Verify parser handles documents with minimal data

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-005</iati-identifier>
  <title><narrative>Test Activity</narrative></title>
  <document-link url="https://example.com/minimal.pdf">
    <title><narrative>Minimal Doc</narrative></title>
  </document-link>
</iati-activity>
```

**Expected Results:**
- ✅ Document parsed successfully
- ✅ `url` and `title` present
- ✅ Optional fields are `undefined`: `format`, `description`, `category_code`, `document_date`
- ✅ `language_code` defaults to `"en"`

---

### Test 1.6: Result-Level vs Activity-Level Separation
**Objective:** Ensure parser only gets activity-level document-links, not result-level

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-006</iati-identifier>
  <title><narrative>Test Activity</narrative></title>
  <document-link url="https://example.com/activity-doc.pdf">
    <title><narrative>Activity Level Doc</narrative></title>
    <category code="A01" />
  </document-link>
  <result type="1">
    <title><narrative>Result 1</narrative></title>
    <document-link url="https://example.com/result-doc.pdf">
      <title><narrative>Result Level Doc</narrative></title>
      <category code="A01" />
    </document-link>
  </result>
</iati-activity>
```

**Expected Results:**
- ✅ Activity-level `document_links` array has 1 document (activity-doc.pdf)
- ✅ Result-level document is NOT in activity's `document_links`
- ✅ Result object has its own `document_links` array with result-doc.pdf

---

## Test Suite 2: XML Import UI Tests

### Test 2.1: Import Review Display
**Objective:** Verify documents appear in import review screen

**Steps:**
1. Use Test 1.2 XML (3 documents)
2. Parse XML in import tab
3. Review the parsed fields list

**Expected Results:**
- ✅ Field appears as: "Document Links (3)"
- ✅ Import value shows: "3 documents to import"
- ✅ Tab is set to: "documents"
- ✅ Description: "Activity-level document links from XML"
- ✅ Field is checked/selected by default
- ✅ No conflict indicator (green checkmark)

---

### Test 2.2: Document Count Display
**Objective:** Verify correct pluralization

**Test Cases:**
- 1 document: "Document Links (1)" → "1 document to import"
- 2 documents: "Document Links (2)" → "2 documents to import"
- 10 documents: "Document Links (10)" → "10 documents to import"

**Expected Results:**
- ✅ Singular form used correctly for 1 document
- ✅ Plural form used for 2+ documents

---

### Test 2.3: No Documents Present
**Objective:** Verify no field shown when no documents in XML

**Test Data:**
```xml
<iati-activity>
  <iati-identifier>TEST-007</iati-identifier>
  <title><narrative>Activity Without Docs</narrative></title>
  <description><narrative>No documents</narrative></description>
</iati-activity>
```

**Expected Results:**
- ✅ No "Document Links" field appears in import review
- ✅ No errors or warnings
- ✅ Other fields display normally

---

### Test 2.4: Unselecting Document Import
**Objective:** Verify documents aren't imported if unchecked

**Steps:**
1. Parse XML with documents
2. In import review, uncheck "Document Links (N)" field
3. Click "Import Selected Fields"
4. Monitor console logs

**Expected Results:**
- ✅ Console does NOT show: `[XML Import] Adding N documents for import`
- ✅ No document import API call made
- ✅ Other selected fields import normally
- ✅ No documents added to activity

---

## Test Suite 3: Import Processing Tests

### Test 3.1: Successful Document Import
**Objective:** End-to-end import of documents

**Steps:**
1. Create/open an activity
2. Navigate to XML Import tab
3. Use Test 1.2 XML (3 documents)
4. Parse and review
5. Keep "Document Links (3)" checked
6. Click "Import Selected Fields"
7. Monitor progress and console

**Expected Results:**
- ✅ Progress shows: "Importing document links..." at 87%
- ✅ Console shows: `[XML Import] Adding 3 documents for import`
- ✅ Console shows: `[XML Import] Processing document links import...`
- ✅ API call to: `/api/activities/{id}/documents/import`
- ✅ Console shows: `[XML Import] Documents imported successfully`
- ✅ Success toast: "Document links imported successfully"
- ✅ Toast description: "3 of 3 document(s) added to the activity"

---

### Test 3.2: Import with Mixed Results
**Objective:** Handle partial success (some docs succeed, some fail)

**Note:** This requires intentionally causing a failure (e.g., database constraint violation)

**Expected Results:**
- ✅ Success toast shows: "X of Y document(s) added"
- ✅ Failed documents logged in console
- ✅ Activity import continues (doesn't block other data)

---

### Test 3.3: Import Error Handling
**Objective:** Verify graceful error handling

**Steps:**
1. Parse XML with documents
2. Before importing, temporarily break the API (e.g., rename route file)
3. Attempt import

**Expected Results:**
- ✅ Error toast displays: "Failed to import document links"
- ✅ Description explains the issue
- ✅ Console shows error details
- ✅ Main activity data still imports
- ✅ User can retry or continue

---

## Test Suite 4: API Endpoint Tests

### Test 4.1: API Basic Functionality
**Objective:** Test API directly with curl/Postman

**API Request:**
```bash
curl -X POST "http://localhost:3000/api/activities/{activity-id}/documents/import" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "url": "https://example.com/doc1.pdf",
        "format": "application/pdf",
        "title": "Test Document",
        "description": "Test description",
        "category_code": "A01",
        "language_code": "en",
        "document_date": "2023-06-15"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 1,
  "failed": 0,
  "errors": [],
  "message": "Imported 1 of 1 documents"
}
```

---

### Test 4.2: API Validation - Missing Documents Array
**Request:**
```json
{ "documents": null }
```

**Expected Response:**
```json
{
  "error": "Documents array is required",
  "details": "Body must contain a \"documents\" array"
}
```
**Status:** 400

---

### Test 4.3: API Validation - Empty Documents Array
**Request:**
```json
{ "documents": [] }
```

**Expected Response:**
```json
{
  "success": 0,
  "failed": 0,
  "errors": [],
  "message": "No documents to import"
}
```

---

### Test 4.4: API Validation - Invalid Activity ID
**Request:**
```bash
POST /api/activities/invalid-uuid/documents/import
```

**Expected Response:**
```json
{ "error": "Activity not found" }
```
**Status:** 404

---

### Test 4.5: API Validation - Missing URL
**Request:**
```json
{
  "documents": [
    {
      "format": "application/pdf",
      "title": "No URL"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": 0,
  "failed": 1,
  "errors": [
    {
      "index": 1,
      "url": "missing",
      "error": "Missing or empty URL"
    }
  ],
  "message": "Imported 0 of 1 documents"
}
```

---

### Test 4.6: API - Duplicate URL Handling
**Objective:** Test importing same URL twice

**Steps:**
1. Import a document with URL "https://example.com/doc.pdf"
2. Import same URL again

**Expected Results:**
- ✅ Second import succeeds (creates duplicate entry)
- OR
- ✅ Database constraint prevents duplicate (if constraint exists)

---

## Test Suite 5: Database Verification Tests

### Test 5.1: Database Schema Compliance
**Objective:** Verify data is stored correctly in activity_documents table

**Steps:**
1. Import documents via XML
2. Query database directly

**SQL Query:**
```sql
SELECT 
  id,
  activity_id,
  url,
  format,
  title,
  description,
  category_code,
  language_codes,
  document_date,
  is_external,
  file_path,
  created_at
FROM activity_documents
WHERE activity_id = '{activity-id}'
ORDER BY created_at DESC;
```

**Expected Results:**
- ✅ Records exist for imported documents
- ✅ `activity_id` matches the activity
- ✅ `url` is stored correctly
- ✅ `format` matches XML format attribute
- ✅ `title` is JSONB array: `[{"text": "...", "lang": "en"}]`
- ✅ `description` is JSONB array (empty array if not provided)
- ✅ `category_code` matches XML or defaults to "A01"
- ✅ `language_codes` is array: `["en"]` or from XML
- ✅ `document_date` is DATE or NULL
- ✅ `is_external` is TRUE
- ✅ `file_path` is NULL (not uploaded file)
- ✅ `created_at` is recent timestamp

---

### Test 5.2: JSONB Title Structure
**Objective:** Verify title is stored as proper JSONB narratives

**Expected Structure:**
```json
[
  {
    "text": "Document Title",
    "lang": "en"
  }
]
```

**Test:**
```sql
SELECT title->0->>'text' as title_text,
       title->0->>'lang' as title_lang
FROM activity_documents
WHERE activity_id = '{activity-id}';
```

**Expected Results:**
- ✅ `title_text` matches XML narrative
- ✅ `title_lang` is "en" or language from XML

---

### Test 5.3: Foreign Key Constraint
**Objective:** Verify activity_id foreign key works

**Test:**
1. Try to insert document with non-existent activity_id

**Expected Results:**
- ✅ Database rejects insert
- ✅ Foreign key constraint error

---

## Test Suite 6: UI Display Tests

### Test 6.1: Documents Tab Display
**Objective:** Verify imported documents appear in Documents tab

**Steps:**
1. Import documents via XML
2. Navigate to activity's "Documents & Images" tab
3. Check document list

**Expected Results:**
- ✅ All imported documents visible
- ✅ Each shows: title, URL, category, date
- ✅ External link icon displayed
- ✅ Clicking URL opens in new tab
- ✅ Documents are sorted (newest first)

---

### Test 6.2: Document Metadata Display
**Objective:** Verify all document metadata displays correctly

**Check Each Document Shows:**
- ✅ Title (from JSONB narrative)
- ✅ Description (if present)
- ✅ Document category (with icon/label)
- ✅ Format/MIME type
- ✅ Language
- ✅ Document date
- ✅ External URL indicator
- ✅ Created timestamp

---

### Test 6.3: Edit Imported Document
**Objective:** Verify imported documents can be edited

**Steps:**
1. Import document via XML
2. In Documents tab, click edit on imported document
3. Change title, description, category
4. Save

**Expected Results:**
- ✅ Edit modal opens with current values
- ✅ Can modify all fields
- ✅ Changes save successfully
- ✅ Updated values display immediately

---

### Test 6.4: Delete Imported Document
**Objective:** Verify imported documents can be deleted

**Steps:**
1. Import document via XML
2. In Documents tab, click delete
3. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Document deleted from database
- ✅ Document removed from UI list
- ✅ Toast confirms deletion

---

## Test Suite 7: Manual Entry Integration Tests

### Test 7.1: Manual + Imported Documents Coexistence
**Objective:** Verify manual and imported documents work together

**Steps:**
1. Manually add 2 documents to activity
2. Import XML with 3 documents
3. View Documents tab

**Expected Results:**
- ✅ All 5 documents visible (2 manual + 3 imported)
- ✅ Can distinguish imported vs manual (via metadata)
- ✅ Both types function identically (edit, delete, view)
- ✅ Sorting works across both types

---

### Test 7.2: Manual Document Upload Still Works
**Objective:** Ensure file upload functionality not broken

**Steps:**
1. Navigate to Documents tab
2. Click "Upload File"
3. Select a PDF file
4. Fill in metadata
5. Save

**Expected Results:**
- ✅ Upload progress indicator
- ✅ File uploads to storage
- ✅ Database record created
- ✅ Thumbnail generated (for images)
- ✅ Document appears in list
- ✅ `is_external` = FALSE
- ✅ `file_path` populated

---

### Test 7.3: Manual External URL Entry Still Works
**Objective:** Ensure adding external URLs manually works

**Steps:**
1. Navigate to Documents tab
2. Click "Add External Link"
3. Enter URL, title, category
4. Save

**Expected Results:**
- ✅ Form validates URL
- ✅ Document saves to database
- ✅ `is_external` = TRUE
- ✅ Document appears in list
- ✅ Works identically to imported documents

---

## Test Suite 8: Edge Cases & Stress Tests

### Test 8.1: Large Number of Documents
**Objective:** Test with many documents

**Test Data:** XML with 50+ document-links

**Expected Results:**
- ✅ Parser handles all documents (check console log)
- ✅ Import review displays count correctly
- ✅ Import completes successfully (may take time)
- ✅ All documents in database
- ✅ Documents tab paginates/scrolls properly

---

### Test 8.2: Very Long URLs
**Objective:** Test URL length limits

**Test Data:**
```xml
<document-link url="https://example.com/very/long/path/with/many/segments/that/goes/on/and/on/document.pdf?param1=value1&param2=value2&param3=value3">
```

**Expected Results:**
- ✅ URL stored completely
- ✅ No truncation
- ✅ Display handles long URLs (truncation in UI, full in tooltip)

---

### Test 8.3: Special Characters in Title/Description
**Objective:** Test Unicode and special characters

**Test Data:**
```xml
<document-link url="https://example.com/doc.pdf">
  <title><narrative>Rapport d'évaluation – 2023 & "Project" (français)</narrative></title>
  <description><narrative>Émile's document with €500 budget</narrative></description>
</document-link>
```

**Expected Results:**
- ✅ All special characters preserved
- ✅ Accents and diacritics display correctly
- ✅ Quotes and ampersands handled
- ✅ No encoding issues

---

### Test 8.4: Multiple Languages
**Objective:** Test different language codes

**Test Data:**
```xml
<document-link url="https://example.com/doc-fr.pdf">
  <title><narrative xml:lang="fr">Document en français</narrative></title>
  <language code="fr" />
</document-link>
<document-link url="https://example.com/doc-es.pdf">
  <title><narrative xml:lang="es">Documento en español</narrative></title>
  <language code="es" />
</document-link>
```

**Expected Results:**
- ✅ Each document has correct language_code
- ✅ Title narratives have correct lang attribute
- ✅ Language displays in UI

---

### Test 8.5: Document Categories
**Objective:** Test all IATI document category codes

**Test Categories:**
- A01: Pre/post-project impact appraisal
- A02: Objectives / Purpose of activity
- A03: Intended ultimate beneficiaries
- A04: Conditions
- A05: Budget
- A06: Summary information about contract
- A07: Review of project performance and evaluation
- A08: Results, outcomes and outputs
- A09: Memorandum of understanding
- A10: Tender
- A11: Contract
- A12: Activity web page
- B01: Annual report
- B02: Institutional Strategy paper
- B03: Country strategy paper
- B04: Aid Allocation Policy
- B05: Procurement Policy and Procedure

**Expected Results:**
- ✅ All category codes accepted
- ✅ Categories display correctly in UI
- ✅ Can filter by category

---

### Test 8.6: Concurrent Imports
**Objective:** Test importing to multiple activities simultaneously

**Steps:**
1. Open 2 browser tabs
2. Import documents to Activity A in tab 1
3. Simultaneously import documents to Activity B in tab 2

**Expected Results:**
- ✅ Both imports succeed
- ✅ No cross-contamination (docs go to correct activities)
- ✅ No database locking issues
- ✅ No race conditions

---

## Test Suite 9: Error Recovery Tests

### Test 9.1: Network Failure During Import
**Objective:** Test handling of network errors

**Steps:**
1. Start XML import with documents
2. Disconnect network during import
3. Observe behavior

**Expected Results:**
- ✅ Error toast displays
- ✅ Clear error message about network
- ✅ User can retry when network restored
- ✅ No partial/corrupted data

---

### Test 9.2: Database Connection Loss
**Objective:** Test database unavailability

**Expected Results:**
- ✅ API returns 500 error
- ✅ User sees error message
- ✅ Can retry once database available

---

### Test 9.3: Invalid XML Recovery
**Objective:** Test malformed document-link elements

**Test Data:**
```xml
<document-link url="https://example.com/bad.pdf">
  <title><!-- Missing narrative element --></title>
</document-link>
```

**Expected Results:**
- ✅ Parser handles gracefully
- ✅ Uses empty string or defaults for missing data
- ✅ Doesn't crash parser
- ✅ Other documents still import

---

## Test Suite 10: Regression Tests

### Test 10.1: Existing Features Still Work
**Objective:** Ensure nothing broken by new code

**Test:**
- ✅ Activity creation still works
- ✅ Activity editing still works
- ✅ Other XML import fields (title, description, sectors, etc.) work
- ✅ Transactions import still works
- ✅ Locations import still works
- ✅ FSS import still works
- ✅ Results import still works

---

### Test 10.2: Result-Level Document Links
**Objective:** Ensure existing result document-link parsing still works

**Steps:**
1. Import XML with result-level document-links
2. Check Results tab

**Expected Results:**
- ✅ Result documents still import correctly
- ✅ Separate from activity-level documents
- ✅ Display in Results tab, not Documents tab

---

## Test Execution Checklist

### Critical Path Tests (Must Pass)
- [ ] Test 1.1: Basic Document Link Parsing
- [ ] Test 1.2: Multiple Document Links
- [ ] Test 2.1: Import Review Display
- [ ] Test 3.1: Successful Document Import
- [ ] Test 5.1: Database Schema Compliance
- [ ] Test 6.1: Documents Tab Display
- [ ] Test 7.1: Manual + Imported Documents Coexistence

### High Priority Tests (Should Pass)
- [ ] Test 1.3: URL Validation and Fixing
- [ ] Test 1.4: Empty/Missing URL Handling
- [ ] Test 2.4: Unselecting Document Import
- [ ] Test 3.3: Import Error Handling
- [ ] Test 4.1: API Basic Functionality
- [ ] Test 6.3: Edit Imported Document
- [ ] Test 6.4: Delete Imported Document
- [ ] Test 7.2: Manual Document Upload Still Works
- [ ] Test 7.3: Manual External URL Entry Still Works

### Medium Priority Tests (Nice to Have)
- [ ] Test 1.5: Minimal Document Link
- [ ] Test 1.6: Result-Level vs Activity-Level Separation
- [ ] Test 2.2: Document Count Display
- [ ] Test 2.3: No Documents Present
- [ ] Test 4.2-4.6: API Validation Tests
- [ ] Test 5.2: JSONB Title Structure
- [ ] Test 8.1-8.5: Edge Cases

### Low Priority Tests (Optional)
- [ ] Test 8.6: Concurrent Imports
- [ ] Test 9.1-9.3: Error Recovery
- [ ] Test 10.1-10.2: Regression Tests

---

## Bug Reporting Template

When a test fails, use this template:

```
**Test Failed:** Test X.Y - Test Name

**Environment:**
- Browser: [Chrome/Firefox/Safari + version]
- Date/Time: [timestamp]
- Activity ID: [if applicable]

**Steps to Reproduce:**
1. [step 1]
2. [step 2]
...

**Expected Result:**
[what should happen]

**Actual Result:**
[what actually happened]

**Console Errors:**
```
[paste console output]
```

**Screenshots:**
[attach if helpful]

**Database State:**
[SQL query results if relevant]
```

---

## Success Criteria

The implementation is considered successful when:

1. ✅ All Critical Path Tests pass
2. ✅ At least 80% of High Priority Tests pass
3. ✅ No critical bugs in Medium Priority Tests
4. ✅ Manual document entry still works
5. ✅ No existing functionality broken
6. ✅ Documents import and display correctly
7. ✅ Database integrity maintained

---

## Quick Smoke Test (5 minutes)

For rapid verification after changes:

1. **Parse Test:** Paste XML snippet with 2 documents → Should see "Document Links (2)"
2. **Import Test:** Import those documents → Should see success toast
3. **Display Test:** Open Documents tab → Should see 2 new documents
4. **Manual Test:** Add 1 manual document → Should see 3 total
5. **Database Test:** Query `activity_documents` table → Should have 3 rows

If all 5 pass, core functionality is working.

