# MODULE 5: IATI Sync Panel - Documentation

## Overview
This module adds an IATI Sync panel to the Activity Editor, allowing users to synchronize activity data with the IATI Datastore. The panel provides functionality for comparing local data with IATI data, selective field importing, and automated synchronization.

## Features

### 1. IATI Identifier Management
- Text input for entering/editing IATI identifier
- Pre-fills with existing IATI identifier if stored

### 2. Data Comparison
- "Compare with IATI" button that fetches and compares data
- Side-by-side comparison of local vs IATI data
- Visual indicators for fields with differences

### 3. Selective Import
- Checkbox for each field to select what to import
- Auto-selects fields that differ from IATI data
- "Import Selected Fields" button

### 4. Auto-sync Configuration
- Toggle switch to enable/disable auto-sync every 24 hours
- Expandable section to configure which fields should auto-sync
- Warning about local changes being overwritten

### 5. Sync Status Display
- Visual status indicator: 🟢 Synced, ⚠️ Outdated, ⛔ Not Synced
- Last sync timestamp display
- Real-time status updates

## Components

### IATISyncPanel Component (`/components/activities/IATISyncPanel.tsx`)

#### Props:
```typescript
interface IATISyncPanelProps {
  activityId: string;
  iatiIdentifier?: string;
  autoSync?: boolean;
  lastSyncTime?: string;
  syncStatus?: 'live' | 'pending' | 'outdated';
  autoSyncFields?: string[];
  onUpdate?: () => void;
  canEdit?: boolean;
}
```

#### Key Features:
- **Comparison Modal**: Shows side-by-side comparison with checkboxes
- **Field Formatting**: Smart formatting for dates, arrays, and complex objects
- **Loading States**: Proper loading indicators during API calls
- **Error Handling**: User-friendly error messages with toast notifications

### Integration in Activity Detail Page

Added to the activity detail page as a new tab between SDG and Organisations tabs:
```tsx
<TabsTrigger value="iati-sync">
  <Globe className="h-4 w-4 mr-1" />
  IATI
</TabsTrigger>
```

## API Integration

### Compare Endpoint (`/api/activities/{id}/compare-iati`)
- **Method**: POST
- **Body**: `{ iati_identifier: string }`
- **Response**: 
  ```json
  {
    "your_data": { ... },
    "iati_data": { ... },
    "comparison": {
      "differences": { "field": true/false }
    }
  }
  ```

### Import Endpoint (`/api/activities/{id}/import-iati`)
- **Method**: POST
- **Body**: 
  ```json
  {
    "fields": { "field_name": true },
    "iati_data": { ... }
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "fields_updated": ["field1", "field2"]
  }
  ```

## Field Mappings

The panel supports comparing and importing these IATI fields:
- `title_narrative` - Activity title
- `description_narrative` - Activity description
- `activity_status` - Current status
- `activity_date_start_planned` - Planned start date
- `activity_date_start_actual` - Actual start date
- `activity_date_end_planned` - Planned end date
- `activity_date_end_actual` - Actual end date
- `sectors` - Sector allocations
- `participating_orgs` - Participating organizations
- `transactions` - Financial transactions
- `default_aid_type` - Default aid type
- `flow_type` - Flow type
- `collaboration_type` - Collaboration type
- `default_finance_type` - Default finance type

## Usage

### Manual Sync:
1. Enter IATI identifier (e.g., "MM-GOV-1234")
2. Click "Compare with IATI"
3. Review differences in the comparison modal
4. Select fields to import
5. Click "Import Selected Fields"

### Auto-sync Setup:
1. Toggle "Enable auto-sync every 24 hours"
2. Expand configuration section
3. Select fields that should auto-sync
4. Save settings

## Database Schema

Add these fields to the activities table:
```sql
ALTER TABLE activities ADD COLUMN iati_identifier VARCHAR(255);
ALTER TABLE activities ADD COLUMN auto_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN last_sync_time TIMESTAMP;
ALTER TABLE activities ADD COLUMN sync_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE activities ADD COLUMN auto_sync_fields JSONB DEFAULT '[]'::jsonb;
```

## Security Considerations

- Only users with `canEditActivity` permission can modify sync settings
- Auto-sync should respect user permissions
- API endpoints should validate user access to the activity

## Future Enhancements

1. **Conflict Resolution**: Better handling of merge conflicts
2. **Sync History**: Track sync history and allow rollback
3. **Bulk Sync**: Sync multiple activities at once
4. **Webhook Integration**: Real-time sync triggered by IATI updates
5. **Field-level Permissions**: Control which fields users can sync

## Testing

### Test Cases:
1. Compare with valid IATI identifier
2. Compare with invalid identifier
3. Import single field
4. Import multiple fields
5. Enable/disable auto-sync
6. Configure auto-sync fields
7. Handle API errors gracefully
8. Respect read-only permissions

### Sample IATI Identifiers for Testing:
- `MM-GOV-1234` - Government activity
- `MM-1-12345` - Partner activity
- `MM-TEST-001` - Test activity 