# Forward Spending Survey (FSS) - Technical Specification

## Overview

This document provides technical details about the Forward Spending Survey (FSS) implementation in the AIMS system.

## Database Schema

### Table: `forward_spending_survey`

One FSS record per activity (enforced by unique constraint).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated ID |
| `activity_id` | UUID | FOREIGN KEY, UNIQUE | Reference to activities table |
| `extraction_date` | DATE | NOT NULL | Date when forecast data was extracted |
| `priority` | INTEGER | CHECK (1-5) | Priority level (1=High, 5=Uncertain) |
| `phaseout_year` | INTEGER | CHECK (2000-2100) | Expected end year of funding |
| `notes` | TEXT | | Additional notes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| `created_by` | UUID | FOREIGN KEY | User who created record |
| `updated_by` | UUID | FOREIGN KEY | User who last updated record |

**Indexes**:
- `idx_fss_activity_id` on `activity_id`
- `idx_fss_extraction_date` on `extraction_date`

**Constraints**:
- `one_fss_per_activity` UNIQUE on `activity_id`

### Table: `fss_forecasts`

Multiple forecasts per FSS (one per year).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated ID |
| `fss_id` | UUID | FOREIGN KEY | Reference to forward_spending_survey |
| `forecast_year` | INTEGER | NOT NULL, CHECK (2000-2100) | 4-digit forecast year |
| `amount` | DECIMAL(15,2) | NOT NULL, CHECK (>= 0) | Forecast amount |
| `currency` | VARCHAR(3) | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code |
| `value_date` | DATE | | Date for currency conversion |
| `usd_amount` | DECIMAL(15,2) | | Converted USD amount |
| `notes` | TEXT | | Forecast-specific notes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_fss_forecasts_fss_id` on `fss_id`
- `idx_fss_forecasts_year` on `forecast_year`

**Constraints**:
- `one_forecast_per_year` UNIQUE on (`fss_id`, `forecast_year`)

**Cascade Behavior**:
- Deleting an FSS automatically deletes all associated forecasts (ON DELETE CASCADE)

## API Endpoints

### FSS Management

#### GET `/api/activities/[id]/fss`
Fetch FSS with all forecasts for an activity.

**Response**:
```json
{
  "id": "uuid",
  "activity_id": "uuid",
  "extraction_date": "2025-01-15",
  "priority": 1,
  "phaseout_year": 2030,
  "notes": "Optional notes",
  "forecasts": [
    {
      "id": "uuid",
      "fss_id": "uuid",
      "forecast_year": 2025,
      "amount": 250000,
      "currency": "GBP",
      "value_date": "2025-01-01",
      "usd_amount": 310000,
      "notes": null
    }
  ]
}
```

**Error Responses**:
- `400`: Activity ID is required
- `500`: Failed to fetch FSS

#### PUT `/api/activities/[id]/fss`
Create or update FSS record.

**Request Body**:
```json
{
  "extraction_date": "2025-01-15",
  "priority": 1,
  "phaseout_year": 2030,
  "notes": "Optional notes"
}
```

**Response**: FSS record

**Error Responses**:
- `400`: Extraction date is required / Invalid priority (must be 1-5) / Invalid phaseout year
- `500`: Failed to save FSS

#### DELETE `/api/activities/[id]/fss`
Delete FSS and all associated forecasts.

**Response**:
```json
{ "success": true }
```

**Error Responses**:
- `500`: Failed to delete FSS

### Forecast Management

#### POST `/api/fss/forecasts`
Create a new forecast.

**Request Body**:
```json
{
  "fss_id": "uuid",
  "forecast_year": 2025,
  "amount": 250000,
  "currency": "GBP",
  "value_date": "2025-01-01",
  "notes": "Optional notes"
}
```

**Response**: Forecast record with calculated `usd_amount`

**Error Responses**:
- `400`: Missing required fields / Invalid year / Amount must be non-negative
- `500`: Failed to create forecast

#### PUT `/api/fss/forecasts`
Update an existing forecast.

**Request Body**: Same as POST, with `id` field

**Response**: Updated forecast record

**Error Responses**:
- `400`: Forecast ID is required / Invalid data
- `500`: Failed to update forecast

#### DELETE `/api/fss/forecasts?id=[id]`
Delete a forecast.

**Response**:
```json
{ "success": true }
```

**Error Responses**:
- `400`: Forecast ID is required
- `500`: Failed to delete forecast

### Import Endpoint

#### POST `/api/activities/[id]/import-fss`
Import FSS from XML in single transaction.

**Request Body**:
```json
{
  "fssData": {
    "extractionDate": "2025-01-15",
    "priority": 1,
    "phaseoutYear": 2030,
    "forecasts": [
      {
        "year": "2025",
        "value": 250000,
        "currency": "GBP",
        "valueDate": "2025-01-01"
      }
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "fss_id": "uuid",
  "imported_forecasts": 3,
  "total_forecasts": 3,
  "errors": []
}
```

## Validation Rules

### FSS Record
- `extraction_date`: Required, valid ISO date format (YYYY-MM-DD)
- `priority`: Optional, integer 1-5
- `phaseout_year`: Optional, integer 2000-2100, should be >= current year
- `notes`: Optional, text

### Forecast
- `forecast_year`: Required, integer 2000-2100, 4 digits
- `amount`: Required, non-negative decimal, max 2 decimal places
- `currency`: Required, valid ISO 4217 3-letter code
- `value_date`: Optional, valid ISO date format
- `notes`: Optional, text
- **Uniqueness**: Only one forecast per year per FSS

## IATI XML Format

### IATI Element Structure

```xml
<fss extraction-date="YYYY-MM-DD" priority="1-5" phaseout-year="YYYY">
  <forecast year="YYYY" value-date="YYYY-MM-DD" currency="CCC">AMOUNT</forecast>
  <!-- Multiple forecast elements allowed -->
</fss>
```

### Attributes

**`<fss>` element**:
- `extraction-date`: (required) ISO date when forecast was created
- `priority`: (optional) Integer 1-5
- `phaseout-year`: (optional) 4-digit year

**`<forecast>` element**:
- `year`: (required) 4-digit forecast year
- `value-date`: (optional) ISO date for currency conversion
- `currency`: (required) ISO 4217 currency code
- **Content**: Numeric amount value

### Example

```xml
<iati-activity>
  <iati-identifier>GB-GOV-1-12345</iati-identifier>
  <title>
    <narrative>Sample Project</narrative>
  </title>
  
  <fss extraction-date="2025-01-15" priority="1" phaseout-year="2030">
    <forecast year="2025" value-date="2025-01-01" currency="GBP">250000</forecast>
    <forecast year="2026" value-date="2025-01-01" currency="GBP">300000</forecast>
    <forecast year="2027" value-date="2025-01-01" currency="GBP">350000</forecast>
  </fss>
</iati-activity>
```

## Currency Conversion

The system uses the Fixed Currency Converter API to convert amounts to USD:

```typescript
const result = await fixedCurrencyConverter.convertToUSD(
  amount,
  currency,
  new Date(value_date)
);
```

- Uses value_date for historical exchange rates
- Stores both original and USD amounts
- Handles conversion failures gracefully
- USD amounts auto-calculate to self (1:1)

## UI Components

### ForwardSpendingSurveyTab

**Location**: `frontend/src/components/activities/ForwardSpendingSurveyTab.tsx`

**Props**:
- `activityId`: string (required)
- `readOnly`: boolean (optional)
- `onFssChange`: (count: number) => void (optional)

**Features**:
- Hero cards showing totals
- FSS form (extraction date, priority, phaseout year, notes)
- Forecasts table with CRUD operations
- Modal for adding/editing forecasts
- Real-time USD conversion
- Auto-save functionality
- Validation and error handling
- Empty states
- Loading states

## Security

### Row Level Security (RLS)

Both tables have RLS enabled with policies:

**forward_spending_survey**:
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: All authenticated users (activity permissions should be checked at application level)

**fss_forecasts**:
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: All authenticated users

## Migration Instructions

### Apply Migration

Run the migration file in Supabase SQL Editor:
```sql
-- Execute: frontend/supabase/migrations/20250116000000_add_fss_tables.sql
```

### Rollback Migration

If needed, rollback using:
```sql
-- Execute: frontend/supabase/migrations/20250116000001_rollback_fss_tables.sql
```

## Testing

### Test Files

1. **`test_fss_comprehensive.xml`**: 8 test cases covering:
   - Multiple forecasts with different currencies
   - All priority levels (1-5)
   - With/without optional fields
   - Single and multi-year forecasts
   - Long-term (10-year) forecasts

2. **`test_fss_simple.xml`**: Basic example with 3 forecasts

### Test Scenarios

1. Import FSS via XML Import tool
2. Create FSS manually
3. Add multiple forecasts
4. Edit existing forecasts
5. Delete forecasts
6. Delete FSS (cascades to forecasts)
7. Currency conversion
8. Validation errors
9. Duplicate year detection

## Performance Considerations

- Indexed foreign keys for fast lookups
- Single query fetches FSS with forecasts (JOIN)
- Currency conversion cached where possible
- Forecasts sorted by year in database query
- Lazy loading of FSS tab (only loads when accessed)

## Future Enhancements

Potential improvements:
- Historical FSS versions/revisions
- Comparison tools (forecast vs actual)
- Bulk forecast operations
- Excel import/export
- Visualization charts
- Email notifications for updates
- FSS templates for common patterns

## Compliance Notes

### IATI Standard

FSS follows IATI 2.03 standard for Forward Spending Survey element.

**References**:
- IATI Standard Documentation: https://iatistandard.org/
- FSS Element: Part of activity-level elements
- Used primarily by UK FCDO and other DAC donors

### OECD DAC Reporting

FSS supports OECD DAC Forward Spending Survey reporting requirements for aid predictability indicators.

