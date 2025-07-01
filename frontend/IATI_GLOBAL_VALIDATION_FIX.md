# IATI Import: Global Validation and Fix Workflow

## Overview

This document describes the comprehensive global validation and fix workflow implemented for the IATI import tool. The system ensures ALL activities and transactions are properly validated, linked, and mapped before import.

## Key Features Implemented

### 1. Enhanced Parser Logic with Comprehensive Validation

The XML parser now performs exhaustive validation on all data:

- **Activity Buffering**: All `<iati-activity>` elements are parsed and buffered before processing transactions
- **Activity Mapping**: Creates a complete map of IATI IDs to internal UUIDs
- **Code Validation**: Validates all code fields against system-recognized values:
  - Transaction types
  - Flow types
  - Finance types
  - Aid types
  - Tied status
  - Disbursement channels
  - Sector codes

### 2. Global UI for Handling All Unlinked Transactions

**AssignTransactionsModal** provides:
- Visual list of all unlinked transactions with details
- Individual assignment dropdowns for each transaction
- Bulk assignment feature: "Assign all unlinked transactions to..."
- Progress tracking with visual indicators
- Prevents import until all transactions are assigned

### 3. Global UI for Handling All Unmapped Codes

**MapCodesModal** provides:
- Categorized display of all unmapped codes
- System code dropdowns for recognized code types
- Manual input option for custom values
- Toggle between dropdown and manual input
- Visual progress tracking
- Prevents import until all codes are mapped

### 4. Import Blocking with Clear Messaging

The system blocks import if:
- Any transactions lack activity assignments
- Any codes remain unmapped

Clear error messages guide users:
```
Import Blocked: Please resolve all issues before proceeding:
• 2 transactions need activity assignment
• 5 codes need mapping
```

## Validation Workflow

### Step 1: Upload
- User uploads IATI XML file
- Basic XML structure validation

### Step 2: Validate
- Comprehensive parsing and validation
- Issues categorized by type and severity
- Summary shows:
  - Total activities/transactions
  - Valid/invalid counts
  - Transactions needing assignment
  - Codes needing mapping

### Step 3: Fix Issues (Multi-Modal)
Based on detected issues, the appropriate modal appears:

1. **Unlinked Transactions** → AssignTransactionsModal
2. **Unmapped Codes** → MapCodesModal
3. **Other Issues** → FixWizardModal (existing)

### Step 4: Preview
- Shows all data with visual indicators
- Blocking message if unresolved issues remain
- Import button disabled until all issues resolved

### Step 5: Import
- Only proceeds when all validations pass
- Applies all fixes and mappings during import

## Code Validation Details

### Validated Code Types

1. **Transaction Types**
   - Valid: 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13

2. **Flow Types**
   - Valid: 10, 13, 14, 15, 19, 20, 21, 22, 30, 35, 36, 37, 40, 50

3. **Finance Types**
   - Valid: 1, 100, 110, 111, 210, 211, 310, 311, 410, 411, 412, 413, 414, etc.

4. **Aid Types**
   - Valid: A01, A02, B01, B02, B03, B04, C01, D01, D02, E01, E02, F01, G01, H01, H02, H03, H04, H05

5. **Tied Status**
   - Valid: 1, 3, 4, 5

6. **Disbursement Channels**
   - Valid: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13

7. **Sector Codes**
   - Pattern: 5-digit codes starting with 1-9

### Validation Rules

- All codes are validated against system-recognized values
- Unrecognized codes are marked as errors (not warnings)
- Users must map all codes before import proceeds

## Database Schema Support

The implementation leverages:
```sql
ALTER TABLE transactions
ADD COLUMN activity_iati_ref TEXT,
ALTER COLUMN activity_id DROP NOT NULL;
```

This allows:
- Storage of original IATI references
- Transactions without immediate activity links
- Future resolution of orphaned transactions

## Post-Import Admin Support

### Planned Features

1. **Unlinked Transactions Filter**
   - Dashboard filter to show only unlinked transactions
   - Bulk assignment tools for post-import cleanup

2. **Validation Status Tags**
   - Visual indicators: ⚠ Missing activity, ⚠ Unmapped code
   - Quick identification of issues

3. **Activity Resolution Tool**
   - Match orphaned transactions when new activities are imported
   - Automatic linking based on IATI references

## Benefits

1. **Data Integrity**: No invalid data enters the system
2. **Complete Validation**: All aspects validated before import
3. **User Guidance**: Clear messaging and intuitive UI
4. **Flexibility**: Manual overrides when needed
5. **Traceability**: Original references preserved

## Error Prevention

The system prevents common import errors:
- Missing activity references
- Invalid code values
- Incomplete data mappings
- Orphaned transactions

## Usage Example

1. Upload file with mixed issues:
   - 2 transactions reference missing activities
   - 3 transactions have unmapped sector codes
   - 1 transaction has invalid flow type

2. Validation shows all issues with counts

3. User clicks "Fix Issues":
   - First: Assign activities modal
   - Then: Map codes modal
   - Finally: Preview with all fixes applied

4. Import proceeds only when all issues resolved

## Technical Implementation

### Key Components

1. **Enhanced Parser** (`/api/iati/parse`)
   - Comprehensive validation logic
   - Code validators for all types
   - Issue tracking and categorization

2. **AssignTransactionsModal**
   - Transaction-to-activity assignment UI
   - Bulk operations support

3. **MapCodesModal**
   - Code mapping interface
   - System code dropdowns
   - Manual input option

4. **Import Blocking Logic**
   - Validates all requirements
   - Clear error messaging
   - Disabled import button

### Data Flow

1. Parse → Validate → Categorize Issues
2. Present Issues → User Fixes → Apply Changes
3. Re-validate → Preview → Import (if valid)

This comprehensive approach ensures data quality and integrity throughout the IATI import process. 