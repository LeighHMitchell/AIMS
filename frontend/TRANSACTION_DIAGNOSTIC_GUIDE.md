# Transaction Import Diagnostic Guide

> **Update: The import process now automatically creates missing activities!** If a transaction references an activity that doesn't exist in the database, a minimal activity record will be created automatically during import. These auto-created activities will have a title prefixed with "[Auto-created]" and will need to be updated with complete details after import.

This diagnostic tool helps identify why IATI transactions are failing to import into your AIMS database.

## Features

- **Comprehensive Validation**: Validates all transaction fields according to IATI standards
- **Code Mapping**: Maps IATI codes to internal database values
- **Activity Resolution**: Checks if referenced activities exist in the database
- **Detailed Logging**: Provides transaction-by-transaction feedback
- **Error Categorization**: Groups failures by type for easy analysis
- **Recommendations**: Suggests fixes based on failure patterns

## Usage

### Via Code

```typescript
import { runTransactionDiagnostic } from '@/utils/transactionDiagnostic';

// Your IATI XML content
const xmlContent = `<?xml version="1.0"?>
<iati-activities>
  <iati-activity>
    <iati-identifier>AA-AAA-123456789-ABC123</iati-identifier>
    <transaction>
      <transaction-type code="3"/>
      <transaction-date iso-date="2024-01-15"/>
      <value currency="USD" value-date="2024-01-15">50000</value>
      <description>
        <narrative>Payment for Q1 activities</narrative>
      </description>
      <provider-org ref="GB-CHC-123456" type="21">
        <narrative>Example Foundation</narrative>
      </provider-org>
      <receiver-org ref="MM-GOV-001" type="10">
        <narrative>Ministry of Health</narrative>
      </receiver-org>
    </transaction>
  </iati-activity>
</iati-activities>`;

// Run diagnostic
const summary = await runTransactionDiagnostic(
  xmlContent,
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Console Output Example

```
🔍 Starting Transaction Diagnostic Analysis...

📋 Processing Activity: AA-AAA-123456789-ABC123
   Found 1 transactions

🔄 Transaction #1:
   ✅ Type: 3 (from "3")
   ✅ Value: 50000 USD
   ✅ Date: 2024-01-15
   ✅ Description: "Payment for Q1 activities..."
   ✅ Provider: Example Foundation
   ✅ Receiver: Ministry of Health
   ❌ INVALID: Activity not found in database: "AA-AAA-123456789-ABC123"

============================================================
📊 TRANSACTION IMPORT DIAGNOSTIC SUMMARY
============================================================
Total Transactions Parsed: 1
✅ Valid & Imported: 0
⏭️  Skipped: 0
❌ Failed: 1

🔍 Failure Breakdown:
   Missing Activity: 1

💡 Recommendations:
   📌 Import activities before transactions, or implement activity auto-creation
============================================================
```

## Common Failure Patterns

### 1. Missing Activity
**Error**: `❌ Activity not found in database: "IATI-IDENTIFIER"`  
**Cause**: The activity referenced by the transaction hasn't been imported yet  
**Fix**: Import activities before their transactions

### 2. Invalid Transaction Type
**Error**: `❌ Invalid transaction type: "unknown-code"`  
**Cause**: IATI transaction type code not recognized  
**Fix**: Add mapping for the code in `TRANSACTION_TYPE_MAP`

### 3. Invalid Value Format
**Error**: `❌ Invalid value format: "$142,000"`  
**Cause**: Value contains formatting characters  
**Fix**: The parser handles common formats, but check for unusual characters

### 4. Invalid Date Format
**Error**: `❌ Invalid date format: "16-09-2019"`  
**Cause**: Date not in ISO format (YYYY-MM-DD)  
**Fix**: The parser handles DD-MM-YYYY and DD/MM/YYYY, but check for other formats

### 5. Database Constraints
**Error**: `❌ Database insert failed: null value in column "xyz"`  
**Cause**: Required field is missing  
**Fix**: Ensure all required fields are populated or make fields optional

## Field Mappings

### Transaction Types
```typescript
'1'  → Incoming Commitment
'2'  → Outgoing Commitment
'3'  → Disbursement
'4'  → Expenditure
'5'  → Interest Repayment
'6'  → Loan Repayment
'7'  → Reimbursement
'8'  → Purchase of Equity
'9'  → Sale of Equity
'11' → Credit Guarantee
'12' → Incoming Funds
'13' → Commitment Cancellation
```

### Tied Status
```typescript
'1' → '4' (Tied)
'2' → '3' (Partially tied)
'3' → '5' (Untied)
'4' → '5' (Unknown → Untied)
'5' → '5' (Untied)
```

### Flow Types
```typescript
'10' → ODA
'20' → OOF
'30' → Private grants
'35' → Private market
'40' → Non flow
'50' → Other flows
```

### Aid Types
```typescript
'A01' → General budget support
'A02' → Sector budget support
'B01' → Core support to NGOs
'B02' → Core contributions to multilateral
'B03' → Contributions to pooled programmes
'B04' → Basket funds/pooled funding
'C01' → Project-type interventions
// ... and more
```

## Extending the Diagnostic

### Adding New Mappings

```typescript
// In transactionDiagnostic.ts
const TRANSACTION_TYPE_MAP: Record<string, string> = {
  // ... existing mappings ...
  'NEW_CODE': '14',  // Add your new mapping
  'New Type Name': '14'  // Support text variations
};
```

### Custom Validation

```typescript
// In diagnoseTransaction method
if (result.values.value > 1000000000) {
  result.warnings.push('⚠️  Unusually large transaction value');
}
```

### Additional Fields

```typescript
// Extract custom fields
result.values.custom_field = transaction['custom-element']?.['@_attribute'];
```

## Database Schema Requirements

The diagnostic assumes your `transactions` table has:
- `uuid` (primary key)
- `activity_id` (foreign key to activities)
- `transaction_type` (enum or text)
- `value` (numeric)
- `currency` (text)
- `transaction_date` (date)
- `status` ('draft' or 'actual')
- All other IATI fields as optional

## Tips for Successful Imports

1. **Import Order**: Always import in this order:
   - Organizations
   - Activities
   - Transactions

2. **Test First**: Run the diagnostic on a sample file before bulk import

3. **Review Warnings**: Even if transactions import, check warnings for data quality issues

4. **Monitor Patterns**: If you see repeated failures, update mappings or schema

5. **Use Service Role Key**: For database operations, use the service role key, not the anon key

## Troubleshooting

### "Cannot read property 'transaction' of undefined"
The XML structure might be different. Check that transactions are nested under `<iati-activity>` elements.

### "foreign key constraint" errors
The referenced activity doesn't exist. Import activities first.

### Large files timeout
Process files in batches or increase timeout limits.

### Currency validation warnings
The diagnostic warns about non-standard currencies but still processes them. 