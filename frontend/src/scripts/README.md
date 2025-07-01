# Myanmar AIMS Scripts

## generate-dummy-activities.ts

Generates 20 comprehensive Myanmar aid activities with full IATI-compliant data for testing your Gantt charts, reports, and other features.

### Quick Start

1. **Setup Database** (if not already done):
   ```sql
   -- In Supabase SQL Editor, run:
   -- frontend/sql/create_custom_groups_tables.sql
   ```

2. **Run the Generator**:
   ```bash
   npm run generate-dummy-data
   ```

3. **Check Your Data**:
   - Visit `/activities` to see the 20 new projects
   - Visit `/organizations/[id]` and check the Timeline View tab
   - Visit `/transactions` to see 300-700 transactions

### What It Creates

- **20 Myanmar Aid Activities** with realistic titles like:
  - "Strengthening Health Systems in Yangon Region"
  - "Rural Development Initiative for Women"
  - "Emergency Response and Resilience Program"

- **12 Sample Organizations** including USAID, World Bank, UNDP, Save the Children

- **300-700 Transactions** across all activities ($10K - $5M each)

- **Rich IATI Data**:
  - Multiple sectors per activity (health, education, WASH, etc.)
  - Policy markers (gender, climate, governance)
  - Working group tags for coordination
  - Myanmar locations (all 14 states/regions)
  - Participating organizations with different roles
  - Budget information

### Perfect For Testing

✅ **Your New Gantt Chart**: Activities have proper start/end dates (2021-2028)  
✅ **Financial Reports**: Multiple transaction types and currencies  
✅ **Geographic Views**: Activities spread across Myanmar regions  
✅ **Sector Analysis**: Each activity has 1-3 sectors with percentages  
✅ **Organization Networks**: Multiple orgs per activity  

### Troubleshooting

**"relation 'custom_groups' does not exist"**
```bash
# Run the custom groups migration first
# Copy contents of frontend/sql/create_custom_groups_tables.sql to Supabase SQL Editor
```

**"invalid input value for enum transaction_type_enum: '2'"**
```sql
-- Add IATI transaction types to your enum:
ALTER TYPE transaction_type_enum ADD VALUE '1';  -- Incoming
ALTER TYPE transaction_type_enum ADD VALUE '2';  -- Commitment
ALTER TYPE transaction_type_enum ADD VALUE '3';  -- Disbursement
-- etc. (see full list in docs/database-setup.md)
```

### Customization

Edit `generate-dummy-activities.ts` to:
- Change number of activities (currently 20)
- Add new organization types
- Modify value ranges
- Add custom sectors or tags 