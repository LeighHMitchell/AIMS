# IATI Import: Transaction Linking and Manual Assignment Improvements

## Overview

This document describes the comprehensive improvements made to the IATI import tool for better handling of transaction-to-activity linking, including automatic linking and manual assignment capabilities.

## Part 1: Auto-Link Transactions to Activities by UUID

### Implementation Details

1. **Enhanced XML Parsing**
   - The parser now buffers all `<iati-activity>` elements before processing transactions
   - Creates a comprehensive activity map with both XML and database activities
   - Automatically links transactions to activities using IATI identifiers

2. **Activity UUID Mapping**
   ```typescript
   const activityUuidMap = new Map<string, string>();
   // Maps IATI ID → Internal UUID
   ```

3. **Transaction Enhancement**
   - Added `activity_id` field to store the internal UUID
   - Added `_needsActivityAssignment` flag for UI indication
   - Preserves `activityRef` for the original IATI reference

### Benefits
- Transactions are automatically linked when the referenced activity exists
- Clear distinction between activities in current XML vs database
- Proper handling of activities that will be created during import

## Part 2: Manual Assignment of Orphaned Transactions

### New UI Component: AssignTransactionsModal

A comprehensive modal dialog that allows users to:

1. **View Unlinked Transactions**
   - Clear display of transaction details (type, date, value, description)
   - Visual indication of missing activity references
   - Transaction count summary

2. **Individual Assignment**
   - Dropdown for each transaction to select an activity
   - Activities shown with title and IATI ID
   - Real-time status updates

3. **Bulk Assignment**
   - "Assign all unassigned to:" functionality
   - Useful for batch processing similar transactions
   - Time-saving for large imports

4. **Activity Selection**
   - Shows both existing database activities and new activities from current import
   - Clear labeling: `[NEW]` prefix for activities in current import
   - Searchable dropdown for easy selection

### Workflow Integration

1. **After Validation**: If transactions need assignment, the modal appears
2. **User Actions**:
   - Assign individual transactions
   - Use bulk assignment
   - Skip unassigned (with confirmation)
3. **Continue to Import**: Only enabled when all transactions are assigned

## Database Schema Updates

Already implemented in previous work:
```sql
ALTER TABLE transactions
ADD COLUMN activity_iati_ref TEXT,
ALTER COLUMN activity_id DROP NOT NULL;
```

## Import Process Enhancements

1. **Priority Order for Activity Resolution**:
   - Manual assignment (if provided)
   - Activity map lookup
   - Orphan resolutions
   - Create new activity (if configured)

2. **"new-" Prefix Handling**:
   - Temporary IDs for activities in current XML
   - Resolved to real UUIDs after activity creation
   - Seamless handling in import process

## UI/UX Improvements

1. **ValidationSummaryPanel**:
   - New "Need Assignment" card showing count
   - 5-column layout when assignments are needed
   - Clear visual indicators

2. **PreviewTable**:
   - Red warning icon for transactions needing assignment
   - Green "Assigned" badge for manually assigned transactions
   - Yellow info icon for other missing references

3. **Progress Tracking**:
   - Real-time assignment counter
   - "All transactions assigned" confirmation
   - Clear next steps

## Error Handling

1. **Validation**:
   - Clear error messages for missing activities
   - Distinction between errors and warnings
   - Actionable guidance for users

2. **Import Safety**:
   - Prevents import of unassigned transactions (unless explicitly allowed)
   - Detailed logging of assignment decisions
   - Transaction skip tracking

## Benefits Summary

1. **Improved Data Quality**: Ensures all transactions are properly linked
2. **User Control**: Manual assignment when automatic linking fails
3. **Efficiency**: Bulk operations for large datasets
4. **Flexibility**: Supports various import scenarios
5. **Traceability**: Original IATI references preserved

## Usage Example

1. Upload IATI XML file
2. System automatically links transactions where possible
3. If unlinked transactions exist:
   - Assignment modal appears
   - User assigns transactions to activities
   - Or uses bulk assignment
4. Preview shows assignment status
5. Import proceeds with all transactions properly linked

## Future Enhancements

1. **Smart Suggestions**: ML-based activity matching
2. **Import History**: Track assignment decisions
3. **Batch Resolution**: Handle multiple files with same missing activities
4. **Activity Creation**: Option to create activities inline for unmatched references 