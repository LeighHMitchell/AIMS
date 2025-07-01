# IATI-Compliant Transaction System Implementation Guide

## Overview
This guide documents the implementation of the fully IATI-compliant transaction system in the AIMS project. The system has been redesigned to adhere to the International Aid Transparency Initiative (IATI) Standard version 2.03.

## Database Schema

### Transaction Table Structure
The `transactions` table has been updated with the following fields:

#### Core Required Fields
- `id` (UUID) - Primary key
- `activity_id` (UUID) - Foreign key to activities table
- `transaction_type` (TEXT) - IATI Transaction Type codes (1-13)
- `transaction_date` (DATE) - ISO date of the transaction
- `value` (NUMERIC) - Transaction amount
- `currency` (TEXT) - ISO 4217 currency code
- `status` (TEXT) - Either 'draft' or 'actual'

#### Optional IATI Fields
- `transaction_reference` (TEXT) - Internal reference number
- `value_date` (DATE) - Date when value was realized
- `description` (TEXT) - Transaction description

#### Provider Organization Fields
- `provider_org_id` (UUID) - FK to organizations table
- `provider_org_type` (TEXT) - IATI organization type code
- `provider_org_ref` (TEXT) - IATI organization identifier
- `provider_org_name` (TEXT) - Organization name fallback

#### Receiver Organization Fields
- `receiver_org_id` (UUID) - FK to organizations table
- `receiver_org_type` (TEXT) - IATI organization type code
- `receiver_org_ref` (TEXT) - IATI organization identifier
- `receiver_org_name` (TEXT) - Organization name fallback

#### Additional IATI Fields
- `disbursement_channel` (TEXT) - IATI disbursement channel code (1-4)
- `sector_code` (TEXT) - DAC sector code
- `sector_vocabulary` (TEXT) - Sector vocabulary used
- `recipient_country_code` (TEXT) - ISO 3166-1 alpha-2 country code
- `recipient_region_code` (TEXT) - Region code
- `recipient_region_vocab` (TEXT) - Region vocabulary
- `flow_type` (TEXT) - IATI flow type code
- `finance_type` (TEXT) - IATI finance type code
- `aid_type` (TEXT) - IATI aid type code
- `aid_type_vocabulary` (TEXT) - Aid type vocabulary
- `tied_status` (TEXT) - IATI tied status code (3-5)
- `is_humanitarian` (BOOLEAN) - Humanitarian flag

### IATI Code Lists Used

#### Transaction Types (1-13)
- `1` - Incoming Commitment
- `2` - Outgoing Commitment
- `3` - Disbursement
- `4` - Expenditure
- `5` - Interest Repayment
- `6` - Loan Repayment
- `7` - Reimbursement
- `8` - Purchase of Equity
- `9` - Sale of Equity
- `11` - Credit Guarantee
- `12` - Incoming Funds
- `13` - Commitment Cancellation

#### Disbursement Channels (1-4)
- `1` - Through central Ministry of Finance/Treasury
- `2` - Direct to implementing institution
- `3` - Aid in kind through third party
- `4` - Not reported

#### Tied Status (3-5)
- `3` - Partially tied
- `4` - Tied
- `5` - Untied

## UI Components

### Transaction Form Component
Location: `frontend/src/components/activities/TransactionForm.tsx`

Features:
- Comprehensive form with all IATI fields
- Organization autocomplete from database
- Manual organization entry option
- Advanced fields collapsible section
- Real-time validation
- Status badges for transaction types

### Transaction List Component
Location: `frontend/src/components/activities/TransactionList.tsx`

Features:
- Summary statistics cards
- Table view with all key fields
- Inline editing capabilities
- Multi-currency support
- Transaction type color coding
- Export functionality (future)

### Transaction Tab Component
Location: `frontend/src/components/activities/TransactionTab.tsx`

Features:
- Integrates form and list components
- Handles API calls
- Permission-based editing
- Real-time updates

## API Endpoints

### Transaction CRUD Operations

#### GET `/api/activities/[id]/transactions`
- Fetches all transactions for an activity
- Includes organization details via joins
- Ordered by transaction date (descending)

#### POST `/api/activities/[id]/transactions`
- Creates a new transaction
- Validates required fields
- Handles organization references

#### PUT `/api/activities/[id]/transactions/[transactionId]`
- Updates an existing transaction
- Maintains activity association
- Updates timestamp

#### DELETE `/api/activities/[id]/transactions/[transactionId]`
- Deletes a transaction
- Validates activity ownership

## IATI Import Integration

The IATI import tool has been updated to handle the new transaction schema:

### Import Route Updates
Location: `frontend/src/app/api/iati/import/route.ts`

Changes:
- Maps IATI transaction type codes to database format
- Handles both numeric and text type identifiers
- Links provider/receiver organizations by ID when available
- Stores IATI identifiers for reference
- Imports all available IATI transaction fields

### Transaction Mapping
```javascript
const iatiTypeToDbType = {
  'Incoming Funds': '12',
  'Incoming Commitment': '1',
  'Outgoing Commitment': '2',
  'Disbursement': '3',
  'Expenditure': '4',
  // ... etc
};
```

## Integration with Activity Detail Page

The transaction management has been integrated into the activity detail page:

1. **New Tab Added**: "Transactions" tab with money icon
2. **Permission-Based Access**: Read-only for users without edit permissions
3. **Grid Layout Updated**: Adjusted to accommodate the new tab

## Migration Guide

### Running the Migration

1. Execute the migration SQL:
```bash
psql -U your_user -d your_database -f database_migration_iati_compliant_transactions.sql
```

2. Update any existing transactions to use new type codes:
```sql
-- Example: Convert old 'C' type to new '2' (Outgoing Commitment)
UPDATE transactions SET transaction_type = '2' WHERE transaction_type = 'C';
```

### Data Validation

After migration, validate:
1. All transaction types are valid IATI codes (1-13)
2. Organization references are properly linked
3. Required fields are populated

## Best Practices

### When Creating Transactions
1. Always specify the transaction type using IATI codes
2. Use organization IDs when available, fallback to names
3. Include descriptions for clarity
4. Set appropriate status (draft vs actual)

### For IATI Compliance
1. Use standard IATI code lists
2. Include provider/receiver organizations
3. Specify disbursement channels for aid flows
4. Add sector codes where applicable
5. Include tied status for commitments

## Testing

### Manual Testing Steps
1. Create a new transaction with all fields
2. Edit an existing transaction
3. Delete a transaction
4. Import transactions via IATI
5. Verify summary calculations

### API Testing
Test all endpoints with various scenarios:
- Valid/invalid transaction types
- Missing required fields
- Organization linking
- Permission checks

## Future Enhancements

1. **Bulk Import/Export**
   - CSV import functionality
   - Excel export with formatting

2. **Advanced Analytics**
   - Transaction flow visualizations
   - Commitment vs disbursement tracking
   - Multi-year financial analysis

3. **IATI Publishing**
   - Generate IATI XML from transactions
   - Validate against IATI schema
   - Publish to IATI Registry

4. **Integration Features**
   - Link transactions to results
   - Connect to budget tracking
   - Financial forecasting

## Troubleshooting

### Common Issues

1. **Transaction Type Errors**
   - Ensure using numeric codes (1-13)
   - Check mapping in import tool

2. **Organization Linking**
   - Verify organization exists in database
   - Check IATI identifier format

3. **Import Failures**
   - Review console logs for details
   - Validate XML against IATI schema
   - Check required fields

### Debug Tips
- Enable console logging in development
- Check network tab for API responses
- Validate data types match schema

## References

- [IATI Standard Documentation](https://iatistandard.org/)
- [IATI Transaction Types](https://iatistandard.org/en/iati-standard/203/codelists/transactiontype/)
- [IATI Organization Types](https://iatistandard.org/en/iati-standard/203/codelists/organisationtype/)
- [IATI Schema](https://github.com/IATI/IATI-Schemas) 