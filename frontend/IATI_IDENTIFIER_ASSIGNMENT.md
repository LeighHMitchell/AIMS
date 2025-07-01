# IATI Identifier Assignment and Transaction Linking

## Overview

This document explains how IATI identifiers are assigned to activities and how transactions are linked to their parent activities during the import process.

## The Problem

Transactions were not being linked to activities even when both were in the same XML import because:
1. The RPC function `insert_iati_transaction` didn't exist in the database
2. Activity identifiers weren't being consistently mapped
3. The database schema didn't support all IATI fields

## The Solution

### 1. Activity Identifier Assignment

When parsing IATI XML, each activity must have its IATI identifier extracted and stored:

```typescript
// In the parser (parse/route.ts)
const activity: ParsedActivity = {
  iatiIdentifier,
  iati_id: iatiIdentifier, // Ensure both field names are populated
  title: extractNarrative(xmlActivity.title),
  // ... other fields
};
```

### 2. Activity Import Process

During import, activities are processed first to establish the ID mapping:

```typescript
// Get the IATI ID from either field name
const iatiId = activity.iati_id || activity.iatiIdentifier;

// Create or update activity
const { data: newActivity } = await supabaseAdmin
  .from('activities')
  .insert({
    iati_id: iatiId,
    title: activity.title,
    // ... other fields
  })
  .select('id')
  .single();

// Map IATI ID to internal UUID
results.activityIdMap[iatiId] = newActivity.id;
```

### 3. Transaction Linking

Transactions are then linked using the established mapping:

```typescript
// Resolve activity UUID from IATI reference
let activityId = transaction.activity_id;

// Handle temporary IDs from parser
if (activityId && activityId.startsWith('new-')) {
  const iatiId = activityId.replace('new-', '');
  activityId = results.activityIdMap[iatiId];
}

// Fallback to activityRef
if (!activityId && transaction.activityRef) {
  activityId = results.activityIdMap[transaction.activityRef];
}
```

### 4. Database Schema Compatibility

Transactions are inserted with only the fields that exist in the database:

```typescript
const transactionData = {
  activity_id: activityId,
  transaction_type: transactionType,
  transaction_date: transaction.transaction_date,
  value: parseFloat(transaction.value),
  currency: currency,
  provider_org: providerOrgName,
  receiver_org: receiverOrgName,
  flow_type: flowType,
  aid_type: aidType,
  tied_status: tiedStatus,
  // Excluded: disbursement_channel, finance_type, sector_code, etc.
};
```

## Import Flow

1. **Parse XML**: Extract activities and transactions with IATI identifiers
2. **Import Activities**: Create/update activities, build ID mapping
3. **Link Transactions**: Use mapping to resolve activity UUIDs
4. **Handle Missing Links**: Track unlinked transactions for manual resolution

## Key Points

- Every activity must have an `iati_id` before import
- The `activityIdMap` links IATI IDs to database UUIDs
- Transactions reference activities by IATI ID, not UUID
- Direct table inserts are used instead of non-existent RPC functions
- Only database-compatible fields are included in inserts

## Benefits

- Activities and transactions from the same XML are properly linked
- No false "missing activity" warnings for same-import references
- Import process completes successfully without RPC errors
- Clear traceability from IATI identifiers to internal IDs 