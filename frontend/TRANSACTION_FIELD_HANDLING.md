# Transaction Field Handling Guide

## Overview

This document outlines the proper patterns for handling transaction field values in API endpoints. Following these patterns is **critical** to prevent data loss bugs, especially for boolean and enum fields.

## The Critical Bug That Was Fixed

### Problem

Previously, transaction updates used the pattern `value || null` which caused a critical bug:

```typescript
// ❌ WRONG - This converts false to null!
const updateData = { is_humanitarian: value || null };

// When value = false:
// is_humanitarian becomes null (data loss!)
```

When a user unchecked the "humanitarian transaction" checkbox (setting `is_humanitarian` to `false`), the value was converted to `null` due to JavaScript's falsy evaluation. After a browser refresh, the unchecked state was lost.

### Solution

Use the centralized field cleaning utilities that properly handle each field type:

```typescript
// ✅ CORRECT - Preserves false values
import { cleanFieldValue } from '@/lib/transaction-field-cleaner';

const cleanedValue = cleanFieldValue('is_humanitarian', value);
// When value = false: cleanedValue = false ✓
```

## Field Cleaning Utilities

All transaction field cleaning functions are centralized in:

```
frontend/src/lib/transaction-field-cleaner.ts
```

### Available Functions

#### 1. `cleanBooleanValue(value: any): boolean`

Cleans boolean fields while **preserving false values**.

```typescript
import { cleanBooleanValue } from '@/lib/transaction-field-cleaner';

// ✅ Correct usage
cleanBooleanValue(false);      // → false (preserved!)
cleanBooleanValue(true);       // → true
cleanBooleanValue(null);       // → false
cleanBooleanValue(undefined);  // → false
cleanBooleanValue('yes');      // → true
cleanBooleanValue('');         // → false

// ❌ NEVER do this:
value || false;  // Wrong! false stays false, but that's coincidence
value || null;   // Wrong! false becomes null (data loss)
```

**When to use**: For fields like `is_humanitarian`, `finance_type_inherited`, `fx_differs`

#### 2. `cleanEnumValue(value: any): string | null`

Cleans enum/code fields, converting empty/invalid values to `null`.

```typescript
import { cleanEnumValue } from '@/lib/transaction-field-cleaner';

// ✅ Correct usage
cleanEnumValue('110');        // → '110'
cleanEnumValue('  110  ');    // → '110' (trimmed)
cleanEnumValue('');           // → null
cleanEnumValue('none');       // → null
cleanEnumValue('undefined');  // → null
cleanEnumValue('null');       // → null
cleanEnumValue(null);         // → null
```

**When to use**: For IATI codes like `aid_type`, `flow_type`, `finance_type`, `tied_status`, `disbursement_channel`, `transaction_type`, `status`, `currency`, organization types, etc.

#### 3. `cleanUUIDValue(value: any): string | null`

Validates and cleans UUID fields.

```typescript
import { cleanUUIDValue } from '@/lib/transaction-field-cleaner';

// ✅ Correct usage
const validUUID = '123e4567-e89b-12d3-a456-426614174000';
cleanUUIDValue(validUUID);           // → validUUID
cleanUUIDValue('  ' + validUUID);    // → validUUID (trimmed)
cleanUUIDValue('not-a-uuid');        // → null (invalid)
cleanUUIDValue('');                  // → null
cleanUUIDValue(null);                // → null
```

**When to use**: For `provider_org_id`, `receiver_org_id`, `provider_activity_uuid`, `receiver_activity_uuid`, `created_by`, `updated_by`, `organization_id`

#### 4. `cleanDateValue(value: any): string | null`

Cleans date fields.

```typescript
import { cleanDateValue } from '@/lib/transaction-field-cleaner';

// ✅ Correct usage
cleanDateValue('2024-01-15');  // → '2024-01-15'
cleanDateValue('');            // → null
cleanDateValue('   ');         // → null
cleanDateValue(null);          // → null
```

**When to use**: For `transaction_date`, `value_date`

#### 5. `cleanTransactionFields(data: any): any`

**Primary function** - cleans all transaction fields at once.

```typescript
import { cleanTransactionFields } from '@/lib/transaction-field-cleaner';

// ✅ Correct usage for bulk updates
const rawData = {
  transaction_type: '1',
  value: 50000,
  is_humanitarian: false,
  aid_type: '  A01  ',
  provider_org_id: '123e4567-e89b-12d3-a456-426614174000',
};

const cleaned = cleanTransactionFields(rawData);
// Result:
// {
//   transaction_type: '1',
//   value: 50000,
//   is_humanitarian: false,  ← preserved!
//   aid_type: 'A01',         ← trimmed
//   provider_org_id: '123e4567-e89b-12d3-a456-426614174000'
// }
```

**When to use**: For full transaction updates (PUT/POST endpoints)

#### 6. `cleanFieldValue(fieldName: string, value: any): any`

Cleans a single field based on its name.

```typescript
import { cleanFieldValue } from '@/lib/transaction-field-cleaner';

// ✅ Correct usage for single-field updates
cleanFieldValue('is_humanitarian', false);  // → false
cleanFieldValue('aid_type', '  A01  ');     // → 'A01'
cleanFieldValue('provider_org_id', uuid);   // → validated UUID or null
```

**When to use**: For field-level autosave (PATCH endpoints)

## Implementation Patterns

### Pattern 1: Field-Level Autosave (PATCH)

**File**: `/api/data-clinic/transactions/[id]/route.ts`

```typescript
import { cleanFieldValue } from '@/lib/transaction-field-cleaner';

export async function PATCH(request: NextRequest, { params }) {
  const { field, value } = await request.json();
  
  // Map camelCase to snake_case
  const fieldMap: Record<string, string> = {
    isHumanitarian: 'is_humanitarian',
    aidType: 'aid_type',
    // ... other mappings
  };
  
  const dbField = fieldMap[field] || field;
  
  // ✅ Use centralized cleaner
  const cleanedValue = cleanFieldValue(dbField, value);
  
  const updateData = { [dbField]: cleanedValue };
  
  // Perform update...
}
```

### Pattern 2: Full Transaction Update (PUT)

**File**: `/api/transactions/route.ts`, `/api/activities/[id]/transactions/[transactionId]/route.ts`

```typescript
import { cleanTransactionFields } from '@/lib/transaction-field-cleaner';

export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  // Exclude metadata fields
  const { id, uuid, created_at, updated_at, ...updateData } = body;
  
  // ✅ Use centralized cleaner for all fields
  const cleanedData = cleanTransactionFields(updateData);
  
  // Handle special cases (e.g., transaction_reference validation)
  cleanedData.transaction_reference = validatedReference;
  
  // Perform update...
}
```

### Pattern 3: Transaction Creation (POST)

```typescript
import { cleanTransactionFields } from '@/lib/transaction-field-cleaner';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // ✅ Clean all fields before insertion
  const cleanedData = cleanTransactionFields(body);
  
  // Set defaults for required fields
  cleanedData.status = cleanedData.status || 'draft';
  cleanedData.is_humanitarian = cleanedData.is_humanitarian || false;
  
  // Perform insert...
}
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Using `||` with Boolean Fields

```typescript
// ❌ WRONG
const updateData = {
  is_humanitarian: body.is_humanitarian || false
};
// Problem: If is_humanitarian is already false, it stays false,
// but if it's explicitly set to false by the user, it also stays false.
// HOWEVER, this breaks when combined with the "|| null" pattern elsewhere!
```

### ❌ Mistake 2: Using `||` with Falsy Values

```typescript
// ❌ WRONG
const updateData = {
  is_humanitarian: value || null
};
// Problem: false becomes null (data loss!)

// ❌ ALSO WRONG
const updateData = {
  value: amount || 0
};
// Problem: If amount is explicitly 0, it works, but this pattern
// is inconsistent with other fields
```

### ❌ Mistake 3: Not Cleaning Enum Fields

```typescript
// ❌ WRONG
const updateData = {
  aid_type: body.aid_type  // Could be '', 'none', '  A01  '
};

// ✅ CORRECT
const updateData = {
  aid_type: cleanEnumValue(body.aid_type)  // Converts to null or 'A01'
};
```

### ❌ Mistake 4: Not Validating UUIDs

```typescript
// ❌ WRONG
const updateData = {
  provider_org_id: body.provider_org_id  // Could be invalid UUID
};

// ✅ CORRECT
const updateData = {
  provider_org_id: cleanUUIDValue(body.provider_org_id)  // Validated or null
};
```

## Testing Requirements

Every new transaction endpoint MUST include tests for:

1. **Boolean field preservation**: Verify `false` is not converted to `null`
2. **Enum field cleaning**: Verify empty strings become `null`
3. **UUID validation**: Verify invalid UUIDs are rejected
4. **Edge cases**: Whitespace, 'none', 'undefined', etc.

See `/frontend/src/__tests__/api/transaction-field-persistence.test.ts` for examples.

## Migration Checklist

When creating or modifying transaction endpoints:

- [ ] Import field cleaners from `@/lib/transaction-field-cleaner`
- [ ] Use `cleanTransactionFields()` for bulk updates
- [ ] Use `cleanFieldValue()` for single-field updates
- [ ] Remove any inline `value || null` or `value || false` patterns
- [ ] Add tests for boolean and enum field handling
- [ ] Verify existing transactions still update correctly

## Field Type Reference

### Boolean Fields
- `is_humanitarian`
- `finance_type_inherited`
- `fx_differs`

**Handler**: `cleanBooleanValue()`

### Enum/Code Fields
- `transaction_type`
- `status`
- `currency`
- `aid_type`
- `flow_type`
- `finance_type`
- `tied_status`
- `disbursement_channel`
- `provider_org_type`
- `receiver_org_type`

**Handler**: `cleanEnumValue()`

### UUID Fields
- `provider_org_id`
- `receiver_org_id`
- `provider_activity_uuid`
- `receiver_activity_uuid`
- `created_by`
- `updated_by`
- `organization_id`

**Handler**: `cleanUUIDValue()`

### Date Fields
- `transaction_date`
- `value_date`

**Handler**: `cleanDateValue()`

### Numeric Fields
- `value`

**Handler**: No cleaning needed (use as-is)

### Text Fields
- `description`
- `transaction_reference`
- `provider_org_name`
- `receiver_org_name`
- Sector/region codes

**Handler**: `fieldValue || null` is acceptable for text

## Questions?

If you're unsure how to handle a field:

1. Check its type in the database schema
2. Look at `transaction-field-cleaner.ts` for similar fields
3. Add a test case first, then implement
4. When in doubt, ask - don't guess!

## See Also

- `/frontend/src/lib/transaction-field-cleaner.ts` - Implementation
- `/frontend/src/__tests__/lib/transaction-field-cleaner.test.ts` - Unit tests
- `/frontend/src/__tests__/api/transaction-field-persistence.test.ts` - Integration tests
- `/frontend/src/types/transaction.ts` - Field type definitions

