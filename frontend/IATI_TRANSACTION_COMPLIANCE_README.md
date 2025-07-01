# IATI 2.03 Transaction Compliance Implementation

## Overview

This implementation ensures the transactions table and export functionality are fully compliant with IATI Standard v2.03, including proper handling of the `<value-date>` element and support for multilingual content.

## Database Changes

### 1. Run the Migration

Execute the following SQL migration to add the necessary fields:

```bash
psql -U your_user -d your_database -f database_migration_iati_value_date_enhancements.sql
```

### 2. New Fields Added

- **Language Fields** (for multilingual support):
  - `description_language` (VARCHAR, default: 'en')
  - `provider_org_language` (VARCHAR, default: 'en')
  - `receiver_org_language` (VARCHAR, default: 'en')

- **Humanitarian Scope Fields** (optional IATI fields):
  - `transaction_scope` (VARCHAR)
  - `humanitarian_scope_type` (VARCHAR)
  - `humanitarian_scope_code` (VARCHAR)
  - `humanitarian_scope_vocabulary` (VARCHAR)

- **Database Trigger**: Automatically sets `value_date` to NULL when it equals `transaction_date`

## Value Date Logic

### Backend Implementation

The API automatically handles the value-date logic:

```typescript
// Only store value_date if different from transaction_date
const value_date = body.value_date && body.value_date !== body.transaction_date 
  ? body.value_date 
  : null;
```

### Frontend Implementation

The TransactionModal includes:
- A checkbox labeled "FX settlement date is different"
- When checked, the value_date field becomes editable
- When unchecked, value_date automatically matches transaction_date

### XML Export

The IATI XML export:
- Only includes the `value-date` attribute when it differs from `transaction-date`
- Follows IATI best practices for attribute inclusion

Example output:
```xml
<!-- When value_date equals transaction_date (attribute omitted) -->
<value currency="USD">10000</value>

<!-- When value_date differs from transaction_date -->
<value currency="USD" value-date="2024-01-15">10000</value>
```

## Usage

### 1. Transaction Form

When creating/editing a transaction:
1. Enter the Transaction Date
2. If the currency exchange or settlement occurred on a different date:
   - Check "FX settlement date is different"
   - Enter the Value Date
3. The system automatically handles the storage logic

### 2. IATI XML Export

```typescript
import { generateTransactionXML, generateActivityXML } from '@/lib/iati-export';

// Export a single transaction
const transactionXML = generateTransactionXML(transaction);

// Export an activity with all transactions
const activityXML = generateActivityXML(activity, transactions);
```

### 3. API Endpoints

**Create Transaction**
```
POST /api/activities/{activityId}/transactions
```

**Update Transaction**
```
PUT /api/activities/{activityId}/transactions/{transactionId}
```

Both endpoints automatically handle the value_date logic.

## Compliance Features

### Required Elements ✅
- Transaction Type
- Transaction Date
- Value (with currency)
- Provider/Receiver Organizations

### Optional Elements ✅
- Value Date (conditional display)
- Transaction Reference
- Description (with language support)
- Disbursement Channel
- Flow Type
- Finance Type
- Aid Type
- Tied Status
- Sector Information
- Geographic Information
- Humanitarian Marker & Scope

### Multilingual Support ✅
- Description narratives support xml:lang
- Organization names support xml:lang
- Default language is 'en'

## Best Practices

1. **Value Date Usage**:
   - Only use when genuinely different from transaction date
   - Common scenarios: currency exchange, delayed settlement
   - The database trigger ensures data consistency

2. **Language Codes**:
   - Use ISO 639-1 codes (e.g., 'en', 'fr', 'es')
   - Default to 'en' if not specified

3. **IATI Compliance**:
   - All code values follow IATI codelists
   - XML output validates against IATI schema
   - Conditional attributes follow IATI guidelines

## Testing

### Database Trigger Test
```sql
-- Insert a transaction where value_date equals transaction_date
INSERT INTO transactions (activity_id, transaction_type, transaction_date, value_date, value, currency)
VALUES ('...', '3', '2024-01-10', '2024-01-10', 10000, 'USD');

-- Check that value_date is NULL
SELECT value_date FROM transactions WHERE activity_id = '...';
-- Result: NULL
```

### API Test
```bash
# Create transaction with same dates
curl -X POST /api/activities/{id}/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "3",
    "transaction_date": "2024-01-10",
    "value_date": "2024-01-10",
    "value": 10000,
    "currency": "USD"
  }'

# Response will have value_date: null
```

## Migration Rollback

If needed, you can rollback the changes:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS enforce_value_date_logic ON transactions;
DROP FUNCTION IF EXISTS check_value_date_difference();

-- Remove columns (be careful - this will lose data)
ALTER TABLE transactions
  DROP COLUMN IF EXISTS description_language,
  DROP COLUMN IF EXISTS provider_org_language,
  DROP COLUMN IF EXISTS receiver_org_language,
  DROP COLUMN IF EXISTS transaction_scope,
  DROP COLUMN IF EXISTS humanitarian_scope_type,
  DROP COLUMN IF EXISTS humanitarian_scope_code,
  DROP COLUMN IF EXISTS humanitarian_scope_vocabulary;
```

## Future Enhancements

1. **Additional Language Support**:
   - Add language variants for all narrative fields
   - Support multiple narratives per field

2. **Validation**:
   - Add frontend validation for language codes
   - Validate humanitarian scope vocabularies

3. **Export Options**:
   - Bulk IATI XML export for multiple activities
   - IATI JSON format support 