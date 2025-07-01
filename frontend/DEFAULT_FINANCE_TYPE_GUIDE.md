# Default Finance Type Implementation Guide

## Overview

The `default_finance_type` field allows activities to specify a default financial instrument (grant, loan, etc.) that will be used as the default value for new transactions. This follows IATI standards and improves data entry efficiency.

## Database Changes

### 1. Migration File
Run the migration: `frontend/sql/add_default_finance_type.sql`

This adds:
- `default_finance_type` column (VARCHAR(4)) to the `activities` table
- Check constraint for valid IATI finance type codes
- Index for performance optimization

### 2. Valid Finance Type Codes

Common codes include:
- **Grants**: 110 (Standard grant), 111 (Subsidies)
- **Loans**: 410 (Aid loan), 421 (Reimbursable grant)
- **Debt Relief**: 510 (Debt forgiveness), 600 (Debt rescheduling)
- **Other**: 700 (FDI), 1100 (Guarantees/insurance)

## Frontend Implementation

### 1. Activity Editor Usage

```tsx
import { DefaultFinanceTypeSelect } from "@/components/forms/DefaultFinanceTypeSelect";
import { FinanceTypeHelp } from "@/components/forms/FinanceTypeHelp";

// In your activity form:
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
    Default Finance Type
    <FinanceTypeHelp />
  </label>
  <DefaultFinanceTypeSelect
    id="defaultFinanceType"
    value={general.defaultFinanceType}
    onValueChange={(value) => setGeneral((g) => ({ ...g, defaultFinanceType: value }))}
  />
</div>
```

### 2. Transaction Form Integration

The TransactionModal component automatically uses the default finance type:

```tsx
// In TransactionModal or TransactionForm
const [formData, setFormData] = useState({
  finance_type: transaction?.finance_type || defaultFinanceType || undefined,
  // ... other fields
});
```

### 3. API Integration

The API endpoints have been updated to handle `defaultFinanceType`:

**POST/PUT Activity:**
```json
{
  "title": "My Activity",
  "defaultFinanceType": "110",
  // ... other fields
}
```

**GET Activity Response:**
```json
{
  "id": "...",
  "title": "My Activity",
  "defaultFinanceType": "110",
  // ... other fields
}
```

## Testing

Run the test suite:
```bash
npm test -- __tests__/default_finance_type.test.ts
```

Tests cover:
1. Creating activities with default_finance_type
2. Updating the field
3. Retrieving activities with the field
4. Constraint validation (invalid codes)
5. Transaction inheritance behavior
6. API integration

## Best Practices

1. **Set at Activity Level**: Choose the most common finance type for the activity's transactions
2. **Override When Needed**: Individual transactions can override the default
3. **Use Standard Codes**: Always use valid IATI finance type codes
4. **Provide Context**: Use the help tooltip to explain the selected type

## Common Finance Types

| Code | Type | Use Case |
|------|------|----------|
| 110 | Standard grant | Traditional development aid grants |
| 410 | Aid loan | Concessional loans with grant element |
| 421 | Reimbursable grant | Grants that may require repayment |
| 700 | FDI | Foreign direct investment projects |
| 1100 | Guarantees | Risk mitigation instruments |

## Troubleshooting

### Issue: Finance type not saving
- Check that the migration has been run
- Verify the code is in the valid list
- Check API response for errors

### Issue: Default not appearing in transactions
- Ensure `defaultFinanceType` is passed to TransactionModal
- Check that the transaction doesn't already have a finance_type set

## Future Enhancements

1. **Auto-inheritance**: Database trigger to automatically set transaction finance_type from activity default
2. **Validation Rules**: Business rules based on finance type (e.g., loans require repayment schedule)
3. **Reporting**: Analytics on finance type distribution
4. **Multi-language**: Translated finance type labels 