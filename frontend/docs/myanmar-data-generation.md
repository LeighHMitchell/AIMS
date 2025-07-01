# Myanmar IATI-Compliant Data Generation

This script generates 20 realistic IATI-compliant aid activities for Myanmar with full transaction data.

## Features

- ✅ **20 IATI-compliant activities** with Myanmar-specific context
- ✅ **15-20 transactions per activity** (Commitments, Disbursements, Expenditures, Reimbursements)
- ✅ **Valid IATI codes** for all fields (aid type, flow type, finance type, etc.)
- ✅ **DAC 5-digit sector codes** with percentage allocations
- ✅ **Myanmar locations** (all 15 states/regions)
- ✅ **Realistic target groups** using job roles (Health Workers, Teachers, etc.)
- ✅ **Structured JSON output** ready for import

## Usage

```bash
# Navigate to frontend directory
cd frontend

# Run the generator
npm run generate-myanmar-data
```

## Output Files

The script generates two JSON files in the frontend directory:

1. **`myanmar-activities-YYYY-MM-DD.json`** - Contains all 20 activities with:
   - IATI identifiers
   - Titles, descriptions, and objectives
   - Target groups and locations
   - IATI codes (aid type, flow type, finance type, status)
   - Sector allocations
   - Organization relationships

2. **`myanmar-transactions-YYYY-MM-DD.json`** - Contains 300+ transactions with:
   - Transaction types (C, D, E, R)
   - Dates, values, and currencies
   - Provider and receiver organizations
   - Descriptions
   - IATI financial codes

## Data Structure

### Activity Fields
```json
{
  "iati_id": "US-1-001",
  "title": "Strengthening Health Systems in Kachin State",
  "description": "Detailed project description...",
  "objectives": "1. To improve health services...",
  "target_groups": ["Health Workers", "Nurses"],
  "recipient_country": "MM",
  "default_aid_type": "C01",
  "default_flow_type": "10",
  "default_finance_type": "110",
  "activity_status": "2",
  "start_date": "2023-06-15",
  "end_date": "2026-12-31",
  "reporting_org_id": "uuid-here",
  "implementing_org_ids": ["uuid1", "uuid2"],
  "sectors": [
    {
      "code": "12220",
      "name": "Basic health care",
      "percentage": 60
    },
    {
      "code": "12281",
      "name": "Health personnel development",
      "percentage": 40
    }
  ],
  "locations": ["Kachin State", "Shan State"],
  "transactions": [...]
}
```

### Transaction Fields
```json
{
  "transaction_type": "D",
  "transaction_date": "2024-03-15",
  "value": 125000.50,
  "currency": "USD",
  "provider_org_id": "uuid-donor",
  "receiver_org_id": "uuid-implementer",
  "description": "Quarterly disbursement",
  "aid_type": "C01",
  "finance_type": "110",
  "flow_type": "10"
}
```

## Import Options

### Option 1: Direct Database Import
```sql
-- Example: Import activities
INSERT INTO activities (iati_id, title, description, ...)
SELECT * FROM json_populate_recordset(NULL::activities, 
  pg_read_file('/path/to/myanmar-activities-2024-01-15.json')::json
);
```

### Option 2: Use Existing Import Tools
1. Navigate to http://localhost:3002/import/activities
2. Upload the generated JSON file
3. Map fields and import

### Option 3: Custom Import Script
Create a script that reads the JSON and inserts using Supabase client:

```typescript
import { createClient } from '@supabase/supabase-js'
import activities from './myanmar-activities-2024-01-15.json'

const supabase = createClient(url, key)

for (const activity of activities) {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
}
```

## Customization

To modify the generator, edit `frontend/src/scripts/generate-myanmar-activities.ts`:

- **Activity count**: Change the loop in `main()` function
- **Transaction count**: Modify `faker.number.int({ min: 15, max: 20 })`
- **Sectors**: Add/remove from `SECTOR_CODES` array
- **Locations**: Modify `MYANMAR_LOCATIONS` array
- **Target groups**: Update `TARGET_GROUPS` array
- **Date ranges**: Adjust in `generateActivity()` function

## Prerequisites

- Node.js and npm installed
- Supabase connection configured in `.env.local`
- At least 5 organizations in the database
- Organizations should have varied types (donors, implementers, etc.)

## Troubleshooting

### "Not enough organizations found"
- Ensure you have at least 5 organizations in your database
- Check that organizations have different types (10, 21, 22, 23, 24, 40, 80)

### "Missing Supabase environment variables"
- Check `.env.local` file exists
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Import failures
- Verify your database schema matches the generated fields
- Check that foreign key constraints are satisfied (organization IDs exist)
- Ensure enum types match (transaction_type, activity_status, etc.) 