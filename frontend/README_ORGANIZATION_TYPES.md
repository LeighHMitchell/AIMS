# Organization Types System Update

This update implements a new organization types dropdown system with the following features:

## Features
- ✅ Enhanced dropdown with labels and descriptions
- ✅ Proper sorting using sort_order field
- ✅ Code-based storage (e.g., '10' for Government, '23' for Bilateral)
- ✅ Maintained cooperation modality auto-calculation with Myanmar-specific logic
- ✅ Fallback to default values if database is unavailable

## Database Setup

### Step 1: Run the SQL Script
Execute the SQL script in your Supabase database:

```bash
# Navigate to the frontend directory
cd frontend

# Run the SQL script in Supabase SQL Editor or via psql
# Copy and paste the contents of database_init_organization_types.sql
```

### Step 2: Alternative API Initialization
If you prefer to initialize via API (useful for development):

```bash
# Make a POST request to initialize the organization_types table
curl -X POST http://localhost:3000/api/organization-types
```

## Organization Types Structure

| Code | Label | Description | Sort Order |
|------|-------|-------------|------------|
| 23 | Bilateral | National development agencies representing a single government | 1 |
| 22 | Multilateral | Intergovernmental organisations with a global or regional mandate | 2 |
| 10 | Government | Ministries, line departments, or state authorities | 3 |
| 30 | Private Sector | For-profit businesses, contractors, or service providers | 4 |
| 15 | NGO | Civil society or non-profit organisations | 5 |
| 20 | Public Sector | State-owned enterprises, public institutions, or local authorities | 6 |
| 21 | Public–Private Partnership | Formal joint arrangements between public and private sectors | 7 |
| 40 | Academic, Training, and Research | Higher education institutions or research and policy institutes | 8 |
| 60 | Foundation | Charitable or grant-making organisations funded by private or public sources | 9 |
| 70 | Other | Organisations that do not fit clearly into the listed categories | 10 |

## Cooperation Modality Logic (Maintained)

The system automatically calculates cooperation modality based on organization type and country:

- **Government (10) + Foreign Country** → External
- **Bilateral (23)** → External  
- **Multilateral (22) or Academic (40)** → Multilateral
- **NGO (15) + Myanmar** → Internal
- **Global/Not Country-Specific** → Multilateral
- **All others** → Other

## API Endpoints

### GET /api/organization-types
Returns all active organization types sorted by sort_order.

### POST /api/organization-types
Initializes/updates the organization_types table with default data.

## UI Changes

### Edit Organization Modal
- Enhanced dropdown shows both label and description
- Real-time cooperation modality calculation
- Tooltip explaining auto-calculation
- Loading states for better UX

### Organization Cards
- Display proper type labels instead of codes
- Updated color coding for new types
- Maintained all existing functionality

## Backward Compatibility

The system includes fallback mechanisms:
- Uses default organization types if database is unavailable
- Graceful handling of missing or invalid type codes
- Maintains existing cooperation modality logic

## Testing

1. **Database Available**: Types loaded from organization_types table
2. **Database Unavailable**: Falls back to hardcoded defaults
3. **Invalid Codes**: Shows code or "Unknown" as fallback
4. **Cooperation Modality**: Auto-calculates based on new type codes

## Migration Notes

- Existing organizations with old type values will need manual migration
- The cooperation modality logic now uses type codes instead of labels
- New organizations will use the code-based system automatically 