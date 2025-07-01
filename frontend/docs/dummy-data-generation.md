# Myanmar AIMS Dummy Data Generation

## Overview
This script generates 20 comprehensive Myanmar aid activities with full IATI-compliant data, including:
- Activities with realistic titles and descriptions
- 15-35 transactions per activity
- Multiple sectors, policy markers, and tags
- Participating organizations with different roles
- Myanmar-specific locations
- Working group tags for coordination
- Budget information

## Prerequisites
1. Ensure your Supabase database is running and accessible
2. Have your environment variables configured in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   # Or for full access:
   SUPABASE_SERVICE_KEY=your-service-key
   ```

## Usage

Run the script from the frontend directory:

```bash
cd frontend
npm run generate-dummy-data
```

## What It Creates

### Organizations (12 sample orgs)
- **Bilateral Donors**: USAID, DFID, JICA
- **Multilateral**: World Bank, ADB, UNDP, UNICEF
- **INGOs**: Save the Children, Oxfam, CARE
- **Local NGOs**: Myanmar Red Cross Society, Community Partners International

### Activities (20 projects)
Each activity includes:
- **IATI Identifier**: e.g., `US-1-ACT00001`
- **Realistic Titles**: 
  - "Strengthening Health Systems in Yangon Region"
  - "Rural Development Initiative for Women"
  - "Emergency Response and Resilience Program"
- **Status Distribution**:
  - 60% Implementation
  - 20% Pipeline
  - 10% Completion
  - 10% Post-completion

### Transactions (300-700 total)
- **Types**: Commitments, Disbursements, Expenditures, Incoming funds
- **Values**: $10,000 - $5,000,000 per transaction
- **Currencies**: USD, EUR, GBP, JPY
- **Dates**: 2021 to present

### Sectors (DAC 5-digit codes)
- Health (12110, 12220, 12261, 13020)
- Education (11110, 11220, 11320)
- Water & Sanitation (14010, 14030)
- Governance (15110, 15150)
- Agriculture (31110, 31120, 31161)
- Social Protection (16010, 16050)
- And more...

### Policy Markers
- Gender Equality
- Aid to Environment
- Climate Change (Mitigation/Adaptation)
- Good Governance
- RMNCH (Reproductive, Maternal, Newborn and Child Health)

### Myanmar Locations
All 14 regions and states:
- Yangon, Mandalay, Sagaing, Bago, Magway, Tanintharyi, Ayeyarwady
- Kachin, Kayah, Kayin, Chin, Mon, Rakhine, Shan

### Working Group Tags
- Health Sector Coordination
- Education Cluster
- WASH Working Group
- Food Security Cluster
- Protection Cluster
- Gender in Humanitarian Action
- And more...

## Data Quality Features
- **Realistic date ranges**: Projects span 2021-2028
- **Percentage validation**: Sectors always total 100%
- **Consistent relationships**: Provider/receiver orgs match transaction types
- **IATI compliance**: All codes follow IATI standards

## Perfect For Testing
✅ **Gantt Charts**: Projects have proper start/end dates
✅ **Financial Reports**: Rich transaction data with multiple currencies
✅ **Sector Analysis**: Multiple sectors per activity with percentages
✅ **Geographic Distribution**: Activities spread across Myanmar
✅ **Organization Networks**: Multiple participating orgs with different roles
✅ **Tag Filtering**: Working group tags for coordination views

## Troubleshooting

### Missing tables error
Ensure you've run all database migrations:
```bash
# Check frontend/sql/ directory for migration files
```

### Transaction type error
If you see `invalid input value for enum transaction_type_enum: "C"`, update your transaction_type enum to include all IATI values:
```sql
ALTER TYPE transaction_type_enum ADD VALUE '1'; -- Incoming
ALTER TYPE transaction_type_enum ADD VALUE '2'; -- Commitment
ALTER TYPE transaction_type_enum ADD VALUE '3'; -- Disbursement
-- etc.
```

### Custom groups table missing
Run the custom groups migration:
```bash
# Execute frontend/sql/create_custom_groups_tables.sql
```

## Customization
Edit `frontend/src/scripts/generate-dummy-activities.ts` to:
- Change the number of activities (line 443)
- Modify organization types
- Add new sectors or tags
- Adjust transaction value ranges
- Change activity title templates 