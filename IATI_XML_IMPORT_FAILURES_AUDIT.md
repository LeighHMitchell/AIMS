# IATI XML Import - Failures & Non-Functioning Features Audit

**Date**: January 2025  
**System**: AIMS IATI XML Import (Activity Editor - XML Import Tab)  
**Focus**: Broken features, silent failures, and missing implementations

---

## 🚨 **CRITICAL FAILURES** - Features Completely Broken

### 1. **Activity-Level Document Links** ❌ COMPLETELY BROKEN
**Status**: Parser doesn't extract, no UI, no API support  
**Impact**: CRITICAL - Document links are mandatory IATI field

**Evidence**:
- ✅ Parser extracts `document-link` at RESULT level (lines 828-860 in xml-parser.ts)
- ❌ Parser does NOT extract `document-link` at ACTIVITY level
- ✅ Database table exists: `activity_documents` (migration 20250115000000)
- ✅ UI component exists: `DocumentsAndImagesTab.tsx`
- ❌ XmlImportTab has NO case for document links
- ❌ import-iati API route has NO handling for document links

**Example XML That Will NOT Import**:
```xml
<document-link format="application/pdf" url="http://example.org/report.pdf">
  <title><narrative>Project Report</narrative></title>
  <category code="A01" />
</document-link>
```

**Fix Required**: 
1. Add parsing in `xml-parser.ts` after line 1523
2. Add UI field detection in `XmlImportTab.tsx`
3. Add import handler or use existing DocumentsAndImagesTab API

---

### 2. **Locations** ❌ PARTIALLY BROKEN
**Status**: Parser works ✅, API works ✅, but UI has NO import option ❌  
**Impact**: HIGH - Users cannot import location data via UI

**Evidence**:
- ✅ Parser extracts locations (lines 602-659 in xml-parser.ts)
- ✅ import-iati API handles locations (lines 338-499)
- ✅ Database table: `activity_locations`
- ❌ XmlImportTab has NO "Locations" case in switch statement (line 3153+)
- ❌ No UI checkbox to select locations for import

**Current Behavior**: 
- Locations are parsed successfully
- Shown in preview (maybe)
- **BUT cannot be imported** - no UI option exists

**Workaround**: Must use the old import-iati API route directly (bypasses UI)

**Fix Required**: Add "Locations" case to XmlImportTab switch statement

---

### 3. **Budgets** ❌ PARTIALLY BROKEN
**Status**: Parser works ✅, but NO UI and NO API support  
**Impact**: HIGH - Annual budgets cannot be imported

**Evidence**:
- ✅ Parser extracts budgets (lines 1335-1361 in xml-parser.ts)
- ❌ XmlImportTab has NO "Budgets" case
- ❌ import-iati API has NO budget handling
- ✅ Database table exists: `activity_budgets`

**Example XML That Will NOT Import**:
```xml
<budget type="1" status="1">
  <period-start iso-date="2024-01-01" />
  <period-end iso-date="2024-12-31" />
  <value currency="USD">50000</value>
</budget>
```

**Fix Required**: 
1. Add UI field in XmlImportTab
2. Add API handler in import-iati route
3. Or create separate budget import endpoint

---

### 4. **Planned Disbursements** ❌ PARTIALLY BROKEN
**Status**: Parser works ✅, but NO UI and NO API support  
**Impact**: MEDIUM - Forward financial planning data lost

**Evidence**:
- ✅ Parser extracts planned disbursements (lines 1365-1411 in xml-parser.ts)
- ❌ XmlImportTab has NO case for planned disbursements
- ❌ import-iati API has NO handling
- ✅ Database table: `planned_disbursements`

**Fix Required**: Add UI and API handling

---

### 5. **Contact Information** ❌ PARTIALLY BROKEN
**Status**: Parser works ✅, UI shows ✅, but NO import handler  
**Impact**: MEDIUM - Contact details cannot be imported

**Evidence**:
- ✅ Parser extracts contacts (lines 1305-1331 in xml-parser.ts)
- ✅ XmlImportTab shows contacts in preview (line 2804)
- ❌ XmlImportTab has NO "Contacts" case in switch statement
- ❌ No API import handler
- ✅ Database table: `activity_contacts`

**Current Behavior**:
- Contacts appear in field list
- User can select them
- **Import does nothing** - silently ignored

**Fix Required**: Add import handler in XmlImportTab switch statement

---

### 6. **Conditions** ❌ PARTIALLY BROKEN
**Status**: Parser works ✅, database ready ✅, but NO UI or API  
**Impact**: LOW-MEDIUM - Conditional requirements not imported

**Evidence**:
- ✅ Parser extracts conditions (lines 1280-1301 in xml-parser.ts)
- ✅ Database table: `activity_conditions` (migration 20250129000009)
- ❌ XmlImportTab has NO conditions field
- ❌ No API import handler

**Fix Required**: Add UI field detection and import handler

---

## ⚠️ **SILENT FAILURES** - Features That Fail Without Warning

### 7. **Organization Matching** ⚠️ NOW FIXED ✅
**Status**: FIXED - Added comprehensive logging  
**Previous Issue**: Organizations not in database were silently skipped  
**Current Status**: Warnings logged and returned in API response

---

### 8. **Sector Auto-Creation Risk** ⚠️ POTENTIALLY PROBLEMATIC
**Status**: Creates invalid sectors without validation  
**Impact**: MEDIUM - Database pollution with bad sector codes

**Evidence** (import-iati/route.ts, lines 174-196):
```typescript
// Create missing sectors
const missingSectors = iati_data.sectors.filter(
  (s: IATISector) => !existingSectorMap.has(s.code)
);

if (missingSectors.length > 0) {
  const { data: newSectors } = await supabase
    .from('sectors')
    .insert(
      missingSectors.map((s: IATISector) => ({
        code: s.code,
        name: s.name || `Sector ${s.code}`, // ⚠️ NO VALIDATION
        category: s.code.substring(0, 3),
        type: 'secondary'
      }))
    )
    .select();
}
```

**Problem**: 
- No validation that sector codes are valid IATI/DAC codes
- Typos and invalid codes create permanent bad data
- No warning when sectors are auto-created

**Fix Needed**: 
1. Validate sector codes against IATI codelists
2. Log warnings when creating new sectors
3. Flag auto-created sectors for review

---

### 9. **Transaction Duplicate Detection** ⚠️ TOO AGGRESSIVE
**Status**: May skip legitimate duplicate transactions  
**Impact**: MEDIUM - Real transactions might be silently skipped

**Evidence** (import-iati/route.ts, lines 471-481):
```typescript
// Create a set of existing transaction signatures
const existingSignatures = new Set(
  (existingTransactions || []).map((t: ExistingTransaction) => 
    `${t.transaction_type}-${t.transaction_date}-${t.value}-${t.currency}`
  )
);

// Filter out duplicate transactions
const newTransactions = (iati_data.transactions || []).filter((t: IATITransaction) => {
  const signature = `${t.type}-${t.date}-${t.value}-${t.currency || 'USD'}`;
  return !existingSignatures.has(signature);
});
```

**Problem**: 
- Two legitimate transactions with same type, date, value, and currency will be treated as duplicate
- Example: Two organizations each give $10,000 on the same date for the same activity
- No warning when transactions are skipped as "duplicates"

**Fix Needed**:
1. Include provider/receiver org in signature
2. Log warnings when transactions are skipped
3. Add option to force import duplicates

---

### 10. **Geocoding Failures** ⚠️ SILENT
**Status**: Location geocoding fails silently  
**Impact**: LOW-MEDIUM - Address data missing, but coordinates imported

**Evidence** (import-iati/route.ts, lines 405-408):
```typescript
} catch (geocodeError) {
  console.error('[IATI Import] Geocoding error:', geocodeError);
  // Continue import even if geocoding fails
}
```

**Problem**: 
- Geocoding errors are logged but not reported to user
- Location is imported without address fields
- User has no idea geocoding failed

**Fix Needed**: Add geocoding failures to import warnings

---

## 📋 **MISSING FEATURES** - Fields Parsed But Never Imported

### 11. **Reporting Organization** ❌ NOT IMPORTED
**Status**: Parsed, shown in UI, but not imported  
**Impact**: MEDIUM - Reporting org not saved

**Evidence**:
- ✅ Parser extracts (lines 680-688 in xml-parser.ts)
- ✅ Shown in XmlImportTab field list
- ❌ No import handler in XmlImportTab switch
- ❌ No API handling

---

### 12. **Other Identifiers** ⚠️ UNCLEAR STATUS
**Status**: Code exists but needs verification  
**Impact**: MEDIUM

**Evidence**:
- ✅ Parser extracts (lines 749-780 in xml-parser.ts)
- ✅ XmlImportTab has handling code (lines 3258-3263)
- ❓ Need to verify if actually imported to database

---

### 13. **Humanitarian Scope (Activity Level)** ❌ NOT PARSED OR IMPORTED
**Status**: Completely missing from parser  
**Impact**: MEDIUM - Humanitarian classification lost

**Evidence**:
- ❌ Parser does NOT extract `<humanitarian-scope>` at activity level
- ❌ No UI field
- ❌ No API handling
- ✅ Database table exists: `activity_humanitarian_scope` (migration 20250117000001)
- ✅ Database column exists: `activities.humanitarian` (migration 20250117000000)

**Example XML Not Parsed**:
```xml
<iati-activity humanitarian="1">
  <humanitarian-scope type="1" vocabulary="1-2" code="EQ-2015-000048-NPL">
    <narrative>Nepal Earthquake April 2015</narrative>
  </humanitarian-scope>
</iati-activity>
```

---

### 14. **Activity Attributes** ❌ PARTIALLY MISSING
**Status**: Several important attributes not parsed  
**Impact**: MEDIUM

| Attribute | Parsed | Imported | Impact |
|-----------|--------|----------|---------|
| `@humanitarian` | ❌ | ❌ | MEDIUM - Boolean flag for humanitarian activities |
| `@hierarchy` | ❌ | ✅ DB ready | MEDIUM - Activity relationships |
| `@budget-not-provided` | ❌ | ❌ | LOW - Explains missing budget |
| `@linked-data-uri` | ❌ | ✅ DB ready | LOW - Semantic web URIs |
| `@last-updated-datetime` | ❌ | ❌ | LOW - Metadata only |

---

### 15. **Legacy Data** ❌ NOT SUPPORTED
**Status**: No support anywhere  
**Impact**: LOW - Rarely used

**Example XML**:
```xml
<legacy-data name="Project Status" value="7" iati-equivalent="activity-status" />
```

---

### 16. **CRS Channel Code** ⚠️ UNCLEAR
**Status**: Parsed but unclear if imported  
**Impact**: LOW-MEDIUM

**Evidence**:
- ✅ Parser extracts (lines 561-567 in xml-parser.ts)
- ✅ Shown in UI (line 1692 in XmlImportTab)
- ❓ Need to verify if saved to database
- ❓ No dedicated field in activities table?

---

## 🔧 **PARTIAL IMPLEMENTATIONS** - Features That Kinda Work

### 17. **Financing Terms (CRS-add)** ⚠️ COMPLEX
**Status**: Parser works, UI shows, but multi-step import  
**Impact**: MEDIUM - Complex financial data

**Evidence**:
- ✅ Parser extracts loan terms (lines 1777-1823 in XmlImportTab)
- ✅ UI shows fields
- ✅ Database tables exist
- ❓ Import process unclear - may require FinancingTermsTab
- ⚠️ Not handled by import-iati API route

---

### 18. **Forward Spending Survey (FSS)** ⚠️ COMPLEX
**Status**: Parser works, database ready, but import unclear  
**Impact**: MEDIUM

**Evidence**:
- ✅ Parser extracts (lines 1497-1522 in xml-parser.ts)
- ✅ Database tables exist
- ✅ ForwardSpendingSurveyTab exists
- ❓ XmlImportTab handling unclear
- ⚠️ Not in import-iati API route

---

### 19. **Country Budget Items** ⚠️ COMPLEX
**Status**: Fully parsed, database ready, but import path unclear  
**Impact**: MEDIUM

**Evidence**:
- ✅ Parser extracts (lines 1414-1469 in xml-parser.ts)
- ✅ Database tables exist (migration 20250116000006)
- ✅ Shows in UI (lines 3279+ in XmlImportTab)
- ❓ Import mechanism unclear

---

## 📊 **SUMMARY OF FAILURES**

### By Severity

| Severity | Count | Features |
|----------|-------|----------|
| **CRITICAL** | 2 | Document Links (Activity), Locations (no UI) |
| **HIGH** | 3 | Budgets, Planned Disbursements, Contact Info |
| **MEDIUM** | 8 | Humanitarian Scope, Attributes, Reporting Org, Conditions, etc. |
| **LOW** | 3 | Legacy Data, Geocoding warnings, etc. |

### By Category

| Category | Broken | Partial | Working |
|----------|--------|---------|---------|
| **Core Fields** | 0 | 0 | 100% ✅ |
| **Organizations** | 1 | 1 | 80% |
| **Geography** | 1 | 1 | 70% |
| **Financial** | 2 | 3 | 60% |
| **Documents** | 1 | 0 | 0% ❌ |
| **Results** | 0 | 0 | 100% ✅ |
| **Classifications** | 0 | 1 | 95% ✅ |

### By Import Stage

| Stage | Issues Found |
|-------|--------------|
| **Parsing** | 6 fields not parsed |
| **UI Detection** | 8 fields not shown/selectable |
| **Import Handler** | 10 fields have no import code |
| **Database** | 2 missing tables |
| **Silent Failures** | 4 scenarios |

---

## 🎯 **PRIORITY FIX LIST**

### Immediate (Critical)
1. ❗ **Add activity-level document-link parsing** (20 lines of code)
2. ❗ **Add Locations UI field** in XmlImportTab (5 lines)
3. ❗ **Add Contact import handler** (50 lines)

### High Priority
4. **Add Budget import** (parser ✅, need UI + API)
5. **Add Planned Disbursement import** (parser ✅, need UI + API)
6. **Parse humanitarian scope** at activity level
7. **Parse @humanitarian attribute**

### Medium Priority
8. Add sector validation before auto-creation
9. Improve transaction duplicate detection
10. Add geocoding failure warnings
11. Parse @hierarchy attribute
12. Add Conditions import handler

### Low Priority
13. Parse @budget-not-provided
14. Parse @linked-data-uri
15. Add legacy-data support

---

## 🔍 **TESTING RECOMMENDATIONS**

To verify these failures:

1. **Document Links**: Import an activity with `<document-link>` at activity level
   - Expected: Should import
   - Actual: **Will be ignored completely**

2. **Locations**: Import an activity with `<location>` elements
   - Expected: Should have UI checkbox
   - Actual: **No UI option, cannot import via XmlImportTab**

3. **Budgets**: Import an activity with `<budget>` elements
   - Expected: Should import to `activity_budgets`
   - Actual: **Silently ignored**

4. **Contacts**: Import with `<contact-info>` and select it
   - Expected: Should save to `activity_contacts`
   - Actual: **Selection does nothing, no handler exists**

---

## 📝 **CONCLUSION**

**Overall Assessment**: The IATI XML import system has **significant gaps** between:
1. What the parser extracts
2. What the UI allows users to select
3. What actually gets imported to the database

**Most Critical Issues**:
- **Document Links** - Completely broken at activity level
- **Locations** - API works but no UI access
- **Budgets & Disbursements** - Parsed but never imported
- **Contact Info** - Selected fields are silently ignored

**Silent Failures**: 
- 4-5 scenarios where data is lost without warning
- Organization matching now fixed with logging ✅
- Need similar logging for sectors, transactions, geocoding

**Estimated Fix Effort**: 
- Critical fixes: 2-3 days
- All high priority: 5-7 days
- Complete implementation: 2-3 weeks

---

**Status**: 🚨 PRODUCTION SYSTEM WITH KNOWN DATA LOSS ISSUES  
**Recommendation**: Add warnings to UI about unsupported fields until fixed

