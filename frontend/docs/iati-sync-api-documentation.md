# IATI Sync API Documentation

## Overview

The IATI Sync feature allows activities in the AIMS to synchronize with the IATI Datastore, enabling automatic updates and data validation against the international aid transparency standard.

## API Endpoints

### 1. Compare Activity with IATI

**Endpoint:** `POST /api/activities/{id}/compare-iati`

Compares local activity data with IATI Datastore data to identify differences.

#### Request

```json
{
  "iati_identifier": "MM-GOV-1234" // Optional - uses activity's iati_id if not provided
}
```

#### Response

```json
{
  "success": true,
  "activity_id": "123e4567-e89b-12d3-a456-426614174000",
  "iati_identifier": "MM-GOV-1234",
  "your_data": {
    "iati_identifier": "MM-GOV-1234",
    "title_narrative": "Education Support Program",
    "description_narrative": "Supporting primary education in rural areas",
    "activity_status": "2",
    "activity_date_start_planned": "2024-01-01",
    "activity_date_start_actual": "2024-01-15",
    "activity_date_end_planned": "2025-12-31",
    "activity_date_end_actual": null,
    "sectors": [
      {
        "code": "11110",
        "name": "Education policy and administrative management",
        "percentage": 60,
        "vocabulary": "DAC"
      }
    ],
    "participating_orgs": [
      {
        "ref": "MM-GOV",
        "name": "Ministry of Education",
        "type": "government",
        "role": "4",
        "roleLabel": "implementer"
      }
    ],
    "transactions": [
      {
        "type": "2",
        "date": "2024-01-01",
        "value": 500000,
        "currency": "USD",
        "description": "Initial commitment"
      }
    ]
  },
  "iati_data": {
    // Same structure as your_data
  },
  "comparison": {
    "has_iati_data": true,
    "iati_error": null,
    "differences": {
      "activity_status": {
        "local": "2",
        "iati": "3",
        "isDifferent": true
      },
      "transactions": {
        "local_count": 5,
        "iati_count": 7,
        "isDifferent": true
      }
    },
    "last_compared": "2024-01-20T10:30:00Z"
  }
}
```

#### Error Responses

- `404 Not Found` - Activity not found
- `400 Bad Request` - No IATI identifier available
- `500 Internal Server Error` - API or comparison error

### 2. Import Selected IATI Fields

**Endpoint:** `POST /api/activities/{id}/import-iati`

Imports selected fields from IATI data into the local activity, with duplicate prevention for transactions and M2M relationship management for sectors and organizations.

#### Request

```json
{
  "fields": {
    "title_narrative": true,
    "description_narrative": true,
    "activity_status": true,
    "activity_date_start_planned": true,
    "activity_date_start_actual": true,
    "activity_date_end_planned": true,
    "activity_date_end_actual": true,
    "sectors": true,
    "participating_orgs": true,
    "transactions": true,
    "default_aid_type": true,
    "flow_type": true,
    "collaboration_type": true,
    "default_finance_type": true
  },
  "iati_data": {
    // Full IATI data object from compare endpoint
  }
}
```

#### Response

```json
{
  "success": true,
  "activity_id": "123e4567-e89b-12d3-a456-426614174000",
  "fields_updated": [
    "title_narrative",
    "description_narrative",
    "activity_status",
    "sectors",
    "transactions"
  ],
  "summary": {
    "total_fields_requested": 10,
    "total_fields_updated": 5,
    "sectors_updated": 3,
    "organizations_updated": 0,
    "transactions_added": 7,
    "last_sync_time": "2024-01-20T11:45:00Z",
    "sync_status": "live"
  }
}
```

#### Features

- **Selective Field Import**: Choose which fields to import from IATI
- **Duplicate Prevention**: Transactions are checked for duplicates based on type+date+value+currency
- **M2M Relationship Management**: 
  - Sectors: Clears existing and adds new sectors, creating missing sector codes
  - Organizations: Maps by IATI ref or name, creates contributor relationships
- **Audit Trail**: Creates `iati_import_log` entry with previous values
- **Sync Status Tracking**: Updates `last_sync_time`, `sync_status`, and `auto_sync_fields`

#### Error Responses

- `404 Not Found` - Activity not found
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Import error (logged to `iati_import_log`)

### 3. Auto-Sync Status (Coming in Module 4)

**Endpoint:** `GET /api/activities/{id}/sync-status`

Returns the current sync status and configuration for an activity.

## Environment Configuration

Add these variables to your `.env.local` file:

```bash
# IATI API Configuration
IATI_API_BASE_URL=https://api.iatistandard.org/datastore
IATI_API_KEY=your_iati_api_key_here  # Optional but recommended
```

## Testing the API

Use the provided test scripts:

### Test Compare Endpoint
```bash
# Test with activity ID only (uses activity's iati_id)
npm run test-iati-compare 123e4567-e89b-12d3-a456-426614174000

# Test with specific IATI identifier
npm run test-iati-compare 123e4567-e89b-12d3-a456-426614174000 MM-GOV-1234
```

### Test Import Endpoint
```bash
# Test importing IATI data (fetches and imports in one script)
npm run test-iati-import 123e4567-e89b-12d3-a456-426614174000
```

The import test script will:
1. First fetch IATI data using the compare endpoint
2. Import selected fields (title, description, status, dates, sectors, transactions)
3. Show a summary of what was imported
4. Run a second partial import test (transactions only)

## Data Normalization

The API normalizes IATI data for consistency:

### Activity Status Codes
- `1` = Pipeline/identification
- `2` = Implementation
- `3` = Finalisation
- `4` = Closed
- `5` = Cancelled
- `6` = Suspended

### Organization Role Codes
- `1` = Funding
- `2` = Accountable
- `3` = Extending
- `4` = Implementing

### Transaction Type Codes
- `1` = Incoming Commitment
- `2` = Outgoing Commitment
- `3` = Disbursement
- `4` = Expenditure
- `5` = Interest Payment
- `6` = Loan Repayment
- `7` = Reimbursement
- `8` = Purchase of Equity
- `9` = Sale of Equity
- `11` = Credit Guarantee
- `12` = Incoming Funds
- `13` = Commitment Cancellation

## Implementation Notes

1. **Caching**: IATI responses are cached for 1 hour to reduce API calls
2. **Narrative Fields**: Automatically extracts text from IATI narrative structures
3. **Date Handling**: Converts IATI activity-date types to separate fields
4. **Array Normalization**: Ensures all array fields are properly formatted
5. **Error Handling**: Gracefully handles missing IATI data or API failures

## Database Schema

The following fields support IATI sync:

```sql
-- Activities table additions
auto_sync BOOLEAN DEFAULT false
last_sync_time TIMESTAMP WITH TIME ZONE
auto_sync_fields JSONB DEFAULT '[]'::jsonb
sync_status TEXT CHECK (sync_status IN ('live', 'pending', 'outdated'))

-- Import log table
iati_import_log (
  id UUID PRIMARY KEY
  activity_id UUID REFERENCES activities(id)
  import_timestamp TIMESTAMP
  import_type TEXT
  result_status TEXT
  result_summary JSONB
  fields_updated TEXT[]
  previous_values JSONB
  error_details TEXT
)
``` 