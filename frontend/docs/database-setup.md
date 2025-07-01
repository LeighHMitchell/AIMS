# Database Setup for Myanmar AIMS

## Required Tables

Before running the dummy data generator, ensure all required tables exist in your Supabase database.

## Quick Setup

### 1. Custom Groups Tables (Required)
The custom groups functionality requires its tables to be created first:

```bash
# From the Supabase SQL Editor, run:
frontend/sql/create_custom_groups_tables.sql
```

This creates:
- `custom_groups` - Stores custom organization groupings
- `custom_group_memberships` - Links organizations to groups
- `custom_groups_with_stats` - View with member counts

### 2. Core Activity Tables
Ensure these core tables exist:
- `activities`
- `activity_transactions`
- `activity_sectors`
- `activity_policy_markers`
- `activity_participating_orgs`
- `activity_locations`
- `activity_tags`
- `activity_budgets`
- `organizations`

### 3. Fix Transaction Type Enum (Required)
The dummy data generator uses IATI standard transaction types. Update your enum to include these:

#### Option 1: Use the safe fix script (Recommended)
```bash
# This script checks existing values and only adds missing ones
psql $DATABASE_URL < frontend/sql/fix-transaction-types.sql
```

#### Option 2: Check and fix manually
```bash
# First run the check script to see what's missing
psql $DATABASE_URL < frontend/sql/check-and-fix-transaction-types.sql
# Then manually run only the ALTER statements for missing values
```

The required IATI transaction type values are:
- '1' - Incoming Funds
- '2' - Commitment (Outgoing)
- '3' - Disbursement
- '4' - Expenditure
- '5' - Interest Payment
- '6' - Loan Repayment
- '7' - Reimbursement
- '8' - Purchase of Equity
- '11' - Incoming Commitment
- '12' - Outgoing Commitment
- '13' - Incoming Pledge

## Running SQL Files

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL content
4. Click "Run"

### Option 2: Supabase CLI
```bash
supabase db push < frontend/sql/create_custom_groups_tables.sql
```

### Option 3: Direct psql
```bash
psql $DATABASE_URL < frontend/sql/create_custom_groups_tables.sql
```

## Verification

After setup, verify tables exist:

```sql
-- Check custom groups
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'custom_group%';

-- Check activity tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'activity%';

-- Check transaction types
SELECT unnest(enum_range(NULL::transaction_type_enum)) AS transaction_type;
```

## Common Issues

### "relation does not exist" errors
- Run the appropriate SQL migration file
- Check you're connected to the correct database

### "invalid input value for enum" errors
- Update the enum type to include all IATI values
- Or modify the script to use only existing enum values

### Permission errors
- Ensure RLS policies are correctly set
- Use service role key for admin operations 