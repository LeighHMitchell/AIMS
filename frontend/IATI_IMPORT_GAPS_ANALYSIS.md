# IATI Import System - Complete Gap Analysis

**Date**: 2025-11-14
**Scope**: Comprehensive scan of IATI XML import system
**Activity**: 61693754-cc3e-4d06-ad44-f84218903ee7

---

## Executive Summary

This analysis examines the complete IATI import pipeline:
- ✅ **39 fields** working correctly (parsed → imported → displayed)
- ⚠️  **12 fields** parsed but NOT imported to database
- ⚠️  **4 fields** imported but NOT displayed in UI
- ❌ **4 IATI fields** completely missing from system

---

## 🚨 CRITICAL GAPS (Fix Immediately)

### 1. **Results Framework** - COMPLETELY MISSING BACKEND
**Severity**: CRITICAL
**Status**: ✅ Parsed (400+ lines), ✅ UI Ready, ❌ Backend Handler Missing

**What's Parsed**:
- Result title, description, type, aggregation status
- Indicators with baselines, targets, actuals
- Periods with target/actual values and locations
- Document links at all levels

**Problem**: Backend has NO handler for `fields.results`
**Location**: `src/app/api/activities/[id]/import-iati/route.ts` - needs handler after line 1525

**Tables Exist**:
- `activity_results`
- `result_indicators`
- `indicator_baselines`
- `indicator_periods`
- `indicator_references`
- All with RLS enabled

**Action Required**:
```typescript
// Add after line 1525 in import-iati/route.ts
if (fields.results && iati_data.results) {
  console.log('[IATI Import] Updating results');
  // Implement results import handler
  // Clear existing: activity_results
  // Insert: results → indicators → baselines → periods
}
```

---

### 2. **Related Activities** - MISSING BACKEND HANDLER
**Severity**: HIGH
**Status**: ✅ Parsed, ✅ UI Tab Exists, ❌ Backend Handler Missing, ❌ Table Missing

**What's Parsed**:
```typescript
{
  ref: string;           // Activity identifier
  type: string;          // 1=Parent, 2=Child, 3=Sibling, 4=Co-funded, 5=Third Party
}
```

**Problem**: Frontend sets flag, tab exists, but backend doesn't save
**Location**: Backend needs handler in route.ts after line 1525

**Tables Needed**:
```sql
CREATE TABLE related_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  related_activity_ref VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Action Required**:
1. Create `related_activities` table
2. Add backend handler
3. Link to existing RelatedActivitiesTab

---

### 3. **Activity Scope** - NOT IN FIELD MAPPINGS
**Severity**: HIGH
**Status**: ✅ Parsed, ✅ DB Column Exists, ✅ Displayed, ❌ Not Imported

**What It Is**: Geographic scope (1=Global, 2=Regional, 3=Multi-national, 4=National, etc.)

**Problem**: Field is prepared in frontend but NOT in backend fieldMappings
**Location**: `src/app/api/activities/[id]/import-iati/route.ts` lines 154-169

**Fix**:
```typescript
const fieldMappings: Record<string, string> = {
  // ... existing fields ...
  activity_scope: 'activity_scope',  // ADD THIS LINE
};
```

---

## ⚠️  HIGH PRIORITY GAPS (Fix Soon)

### 4. **Hierarchy** - NOT IN FIELD MAPPINGS
**Severity**: MEDIUM-HIGH
**Status**: ✅ Parsed, ✅ DB Column, ✅ Displayed, ❌ Not Imported

**What It Is**: Activity hierarchy level (1=Parent, 2=Child, etc.)
**IATI Attribute**: `<iati-activity hierarchy="1">`

**Problem**: Parsed and displayed but NOT imported
**Fix**: Add to fieldMappings: `hierarchy: 'hierarchy'`

---

### 5. **Description Types** - NOT IN FIELD MAPPINGS
**Severity**: MEDIUM-HIGH
**Status**: ✅ Parsed, ✅ DB Columns, ✅ Displayed, ❌ Not Imported

**Fields Missing**:
- `description_objectives` (IATI type="2")
- `description_target_groups` (IATI type="3")
- `description_other` (IATI type="4")

**Problem**: Frontend prepares them, backend ignores them

**Fix**: Add to fieldMappings:
```typescript
description_objectives: 'description_objectives',
description_target_groups: 'description_target_groups',
description_other: 'description_other'
```

---

### 6. **Other Identifiers** - SEPARATE ENDPOINT
**Severity**: MEDIUM
**Status**: ✅ Parsed, ✅ Saved, ❌ Not in Main Import, ❌ Not Displayed

**What's Parsed**:
```typescript
{
  ref: string;          // Identifier value
  type: string;         // A1, A2, A3, etc.
  ownerOrg: {
    ref: string;        // Organization reference
    narrative: string;  // Organization name
  }
}
```

**Problem**: Uses separate `/api/activities/field` endpoint instead of main import handler

**Current Behavior**: Saved to `other_identifiers` JSONB column but not displayed anywhere

**Action Required**:
1. Integrate into main import flow
2. Add display in Identifiers tab

---

### 7. **Language** - COMPLETELY MISSING FROM IMPORT
**Severity**: MEDIUM
**Status**: ✅ Parsed, ✅ DB Column, ❌ Not Imported, ❌ Not Displayed

**What It Is**: Default language code (ISO 639-1)
**IATI Attributes**: `xml:lang` or `default-language`

**Problem**: Completely missing from import flow

**Fix**:
1. Add to fieldMappings: `language: 'language'`
2. Add language selector to frontend import UI
3. Display in activity viewer

---

## 🔍 FIELDS IMPORTED BUT NOT DISPLAYED

These ARE saved but hidden from users:

### 8. **Contacts** - NO DISPLAY
**Status**: ✅ Imported, ❌ Not Displayed

**Data Saved**: `activity_contacts` table with:
- Organization, department, person name
- Job title, email, phone, website
- Mailing address

**Action Required**: Create `ContactsTab` component

---

### 9. **Conditions** - NO DISPLAY
**Status**: ✅ Imported, ❌ Not Displayed

**Data Saved**: `activity_conditions` table with:
- Condition type (1=Policy, 2=Performance)
- Narrative text
- Attached flag

**Action Required**: Create `ConditionsTab` or section

---

### 10. **Humanitarian Scopes** - PARTIAL DISPLAY
**Status**: ✅ Imported, ⚠️  Only Flag Shown

**Data Saved**: `activity_humanitarian_scope` table with:
- Scope type (1=Emergency, 2=Appeal)
- Vocabulary (1-1, 1-2, 2-1, 99)
- Code (e.g., "EQ-2015-000048-NPL")
- Narratives

**Current Display**: Only boolean `humanitarian` flag shown

**Action Required**: Show detailed scopes with codes and names

---

### 11. **Country Budget Items** - NO DISPLAY
**Status**: ✅ Imported, ❌ Not Displayed

**Data Saved**: `country_budget_items` + `budget_items` tables with:
- Vocabulary (1-7 for different classification systems)
- Code and percentage for each item

**Action Required**: Add section to BudgetsTab showing government budget alignment

---

## 📋 LOWER PRIORITY GAPS

### 12. **Budget Not Provided** Flag
**Status**: ✅ Parsed, ✅ DB Column, ❌ Not Imported, ❌ Not Displayed
**Impact**: LOW-MEDIUM - Explains why budgets are missing

### 13. **Linked Data URI**
**Status**: ✅ Parsed, ✅ DB Column, ❌ Not Imported, ❌ Not Displayed
**Impact**: LOW - Semantic web feature

### 14. **Forward Spending Survey (FSS)**
**Status**: ✅ Parsed, ❌ No Table, ❌ Not Imported, ❌ Not Displayed
**Impact**: LOW-MEDIUM - OECD DAC forward spending projections

### 15. **Humanitarian Flag** (standalone)
**Status**: ⚠️  Only imported when humanitarian scopes exist
**Impact**: MEDIUM - Should be importable independently

---

## 🛠️  IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (1-2 days)
✅ Already fixed:
- [x] Default Currency
- [x] Default Tied Status
- [x] Tags
- [x] Country Budget Items
- [x] CRS Channel Code

🔧 **Next Steps**:
1. Add to fieldMappings (5 mins each):
   - `activity_scope`
   - `hierarchy`
   - `description_objectives`
   - `description_target_groups`
   - `description_other`
   - `language`
   - `budget_not_provided`
   - `linked_data_uri`

### Phase 2: Display Missing Fields (2-3 days)
2. Create display components:
   - ContactsTab.tsx
   - ConditionsTab.tsx or section
   - Humanitarian scopes detail view
   - Country budget items in BudgetsTab
   - Other identifiers in Identifiers tab

### Phase 3: Complex Features (3-5 days)
3. Implement Results Framework:
   - Backend handler for nested results/indicators/periods
   - Frontend display integration with existing ResultsTab

4. Implement Related Activities:
   - Create database table
   - Backend handler
   - Link to existing RelatedActivitiesTab

5. FSS (if needed):
   - Create tables
   - Import handler
   - Display component

---

## 📊 TESTING CHECKLIST

After implementing fixes, verify with this IATI XML file containing ALL fields:

```xml
<iati-activity hierarchy="1" budget-not-provided="false" linked-data-uri="http://..." xml:lang="en" humanitarian="1">
  <iati-identifier>AA-AAA-123456789-ABC123</iati-identifier>

  <!-- Other Identifiers -->
  <other-identifier ref="ABC123-XYZ" type="A1">
    <owner-org ref="AA-AAA-123456789">Organisation name</owner-org>
  </other-identifier>

  <!-- All Description Types -->
  <description type="1"><narrative>General description</narrative></description>
  <description type="2"><narrative>Objectives</narrative></description>
  <description type="3"><narrative>Target groups</narrative></description>
  <description type="4"><narrative>Other info</narrative></description>

  <!-- Activity Scope -->
  <activity-scope code="3"/>

  <!-- Results -->
  <result type="1">
    <title><narrative>Result title</narrative></title>
    <indicator measure="1">
      <title><narrative>Indicator title</narrative></title>
      <baseline year="2020" value="100"/>
      <period>
        <period-start iso-date="2021-01-01"/>
        <period-end iso-date="2021-12-31"/>
        <target value="150"/>
        <actual value="140"/>
      </period>
    </indicator>
  </result>

  <!-- Related Activities -->
  <related-activity ref="AA-AAA-123456789-PARENT" type="1"/>

  <!-- Contacts -->
  <contact-info type="1">
    <organisation><narrative>Agency A</narrative></organisation>
    <person-name><narrative>John Doe</narrative></person-name>
    <job-title><narrative>Project Manager</narrative></job-title>
    <telephone>+1-555-0123</telephone>
    <email>john@agency.org</email>
  </contact-info>

  <!-- Conditions -->
  <conditions attached="1">
    <condition type="1"><narrative>Policy condition text</narrative></condition>
  </conditions>

  <!-- Humanitarian Scope -->
  <humanitarian-scope type="1" vocabulary="1-2" code="EQ-2015-000048-NPL">
    <narrative>Nepal Earthquake April 2015</narrative>
  </humanitarian-scope>

  <!-- Country Budget Items -->
  <country-budget-items vocabulary="4">
    <budget-item code="1844" percentage="50">
      <description><narrative>COFOG classification</narrative></description>
    </budget-item>
  </country-budget-items>

  <!-- FSS -->
  <fss extraction-date="2024-01-01" priority="1" phaseout-year="2026">
    <forecast year="2024" value-date="2023-12-31" currency="USD">1000000</forecast>
  </fss>
</iati-activity>
```

**Verification**:
1. ✅ All fields import without errors
2. ✅ All fields display in appropriate tabs
3. ✅ Re-import shows all fields as "already imported"
4. ✅ Database diagnostic shows all data saved

---

## 🔗 FILE REFERENCE

**Key Files**:
- XML Parser: `src/lib/xml-parser.ts`
- Frontend Import: `src/components/activities/IatiImportTab.tsx`
- Backend Handler: `src/app/api/activities/[id]/import-iati/route.ts`
- Activity Viewer: `src/app/activities/[id]/page.tsx`
- Database Schema: `sql/migrations/20250120000000_add_missing_iati_fields.sql`

**Critical Line Numbers**:
- Field Mappings: route.ts lines 154-169
- Import Flags: IatiImportTab.tsx lines 6100-6134
- Handler Location for New Features: route.ts after line 1525

---

**Last Updated**: 2025-11-14
**Next Review**: After implementing Phase 1 fixes
