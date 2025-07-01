# IATI Import: Handling Missing Activity References

## Summary of Improvements

This document describes the improvements made to the IATI import tool to better handle transactions that reference missing activities.

## Problem Statement

Previously, when importing IATI XML files, transactions that referenced activities not found in the database or current import would cause errors and block the import process. This was problematic because:

1. IATI files often contain partial data sets
2. Activities might be imported in different batches
3. Some transactions might reference external activities managed elsewhere

## Solution Implemented

### 1. Database Schema Changes

Added a new column to the transactions table:
```sql
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS activity_iati_ref TEXT;

-- Make activity_id nullable
ALTER TABLE transactions
ALTER COLUMN activity_id DROP NOT NULL;
```

This allows us to:
- Store the original IATI activity reference for traceability
- Import transactions even when the referenced activity doesn't exist
- Maintain data integrity while allowing flexibility

### 2. Parsing Logic Improvements

Updated the XML parsing logic to:
- Buffer all activities before processing transactions
- Distinguish between activities in the current XML vs those in the database
- Categorize missing activity references as warnings (not errors) when the activity is in the current batch

### 3. Import Process Enhancements

The import process now:
- Stores the `activity_iati_ref` for all transactions
- Allows `activity_id` to be null for unresolved references
- Logs warnings instead of failing when activities are missing
- Provides detailed reporting of orphaned transactions

### 4. UI Improvements

Enhanced the user interface to:
- Show visual indicators (warning icons) for transactions with missing activities
- Display a summary alert showing how many transactions reference missing activities
- Allow users to proceed with import despite missing references
- Provide detailed information about which activities are missing

## Benefits

1. **Resilient Imports**: The import process no longer fails due to missing activity references
2. **Data Traceability**: Original IATI references are preserved for future resolution
3. **Better User Experience**: Clear warnings and the ability to proceed with partial data
4. **Flexibility**: Supports incremental imports and partial data sets

## Usage Example

Given an IATI XML file with:
- Activity TEST-001 with 1 transaction
- Activity TEST-002 with 3 transactions (2 referencing missing activities)

The import will:
1. Successfully import both activities
2. Import all transactions, storing the IATI references
3. Show warnings for the 2 transactions with missing activities
4. Allow the user to complete the import

## Future Enhancements

Potential future improvements:
1. Batch resolution tool to link orphaned transactions to activities imported later
2. Activity search/matching interface for manual resolution
3. Automatic matching based on IATI identifiers when new activities are imported
4. Export report of unresolved transactions for external processing 