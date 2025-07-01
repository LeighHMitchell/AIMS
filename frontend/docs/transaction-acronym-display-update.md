# Transaction Organization Acronym Display Update

## Overview
Updated the transactions table to display organization acronyms (e.g., "USAID") instead of full names (e.g., "United States Agency for International Development") in the Provider → Receiver column.

## Changes Made

### 1. API Route Updates

#### `/api/transactions` (Main transactions list)
- Updated query to include `acronym` field from organizations table
- Modified transformation logic to prioritize acronyms:
  - `provider_org_name`: Uses `acronym` → `name` → `provider_org_name` fallback
  - `receiver_org_name`: Uses `acronym` → `name` → `receiver_org_name` fallback
- Added full name fields for reference:
  - `provider_org_full_name`: Contains the full organization name
  - `receiver_org_full_name`: Contains the full organization name

#### `/api/transactions/[id]` (Transaction detail)
- Same updates as above for individual transaction fetching

#### `/api/activities/[id]/transactions` (Activity transactions)
- Updated to fetch `acronym` field
- Transform logic prioritizes acronyms in provider/receiver names

#### `/api/activities/[id]/transactions/[transactionId]` (Update transaction)
- Updated PUT method to include acronyms in response

#### `/api/activities/[id]/linked-transactions` (Linked transactions)
- Fetches organization acronyms
- Uses acronyms in provider/receiver organization names

### 2. Display Components
The `TransactionTable` component automatically uses the updated `provider_org_name` and `receiver_org_name` fields, which now contain acronyms.

## Technical Details

### Database Structure
- Organizations table has an `acronym` field
- Transactions table has:
  - `provider_org_id` → foreign key to organizations
  - `receiver_org_id` → foreign key to organizations
  - `provider_org_name` → fallback text field
  - `receiver_org_name` → fallback text field

### Priority Logic
For each organization display:
1. Use `acronym` if available (from organizations table)
2. Fall back to `name` if no acronym
3. Fall back to stored `provider_org_name`/`receiver_org_name` (for imported data)

## Testing
1. Navigate to `/transactions` page
2. Check that organizations are displayed as acronyms (e.g., "USAID", "WB", "UNDP")
3. Organizations without acronyms will show their full name
4. Hover over transactions to see tooltips (if implemented) with full names

## Backwards Compatibility
- Full organization names are preserved in `provider_org_full_name` and `receiver_org_full_name`
- Existing transaction data without linked organizations still displays correctly
- No database migrations required

## Future Enhancements
1. Add tooltips showing full organization name on hover
2. Create a batch update script to populate missing acronyms
3. Add validation to ensure new organizations always have acronyms 