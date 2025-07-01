# MODULE 6: Optional Enhancements - Documentation

## Overview
This module adds two optional enhancements to improve the IATI integration:
- **6A: Field Mapping Helper** - A reusable utility for mapping between IATI and AIMS field names
- **6B: Sync Status Indicators** - Visual indicators showing IATI sync status on the activity list

## 6A: Field Mapping Helper

### Purpose
The field mapping helper (`/lib/iati-field-mapper.ts`) provides a centralized way to:
- Map IATI XML field names to AIMS database field names
- Transform values between IATI and AIMS formats
- Validate IATI data completeness
- Compare IATI and AIMS data

### Key Features

#### Field Mappings
```typescript
export const FIELD_MAPPINGS: FieldMapping[] = [
  {
    iatiField: 'title_narrative',
    aimsField: 'title',
    description: 'Activity title'
  },
  {
    iatiField: 'activity_status',
    aimsField: 'activityStatus',
    transform: (value: string) => ACTIVITY_STATUS_MAP[value] || 'pipeline',
    reverseTransform: (value: string) => REVERSE_ACTIVITY_STATUS_MAP[value] || '1',
    description: 'Activity status with code conversion'
  },
  // ... more mappings
];
```

#### Status Code Conversion
Maps between IATI numeric codes and AIMS status names:
- `'1'` → `'pipeline'`
- `'2'` → `'implementation'`
- `'3'` → `'finalisation'`
- `'4'` → `'closed'`
- `'5'` → `'cancelled'`
- `'6'` → `'suspended'`

#### Available Functions

1. **mapIatiToAims(iatiData)** - Convert IATI data to AIMS format
   ```typescript
   const aimsData = mapIatiToAims({
     title_narrative: "Project Title",
     activity_status: "2"
   });
   // Result: { title: "Project Title", activityStatus: "implementation" }
   ```

2. **mapAimsToIati(aimsData)** - Convert AIMS data to IATI format
   ```typescript
   const iatiData = mapAimsToIati({
     title: "Project Title",
     activityStatus: "implementation"
   });
   // Result: { title_narrative: "Project Title", activity_status: "2" }
   ```

3. **compareData(aimsData, iatiData)** - Compare datasets and find differences
   ```typescript
   const comparison = compareData(aimsData, iatiData);
   // Returns: { differences: [...], hasDifferences: boolean }
   ```

4. **validateIatiData(iatiData)** - Check if required fields are present
   ```typescript
   const validation = validateIatiData(iatiData);
   // Returns: { isValid: boolean, missingFields: [...], warnings: [...] }
   ```

### Complex Field Transformations

#### Sectors
```typescript
{
  iatiField: 'sectors',
  aimsField: 'sectors',
  transform: (sectors: any[]) => {
    return sectors.map(s => ({
      code: s.code || s.sector_code,
      name: s.name || s.sector_name,
      percentage: parseFloat(s.percentage) || 0,
      vocabulary: s.vocabulary || '1'
    }));
  }
}
```

#### Transactions
```typescript
{
  iatiField: 'transactions',
  aimsField: 'transactions',
  transform: (transactions: any[]) => {
    return transactions.map(t => ({
      type: t.transaction_type?.code || t.type,
      date: t.transaction_date || t.date,
      value: parseFloat(t.value?.amount || t.value || 0),
      currency: t.value?.currency || t.currency || 'USD',
      description: t.description?.narrative || t.description,
      providerOrg: t.provider_org?.ref || t.provider_org,
      receiverOrg: t.receiver_org?.ref || t.receiver_org
    }));
  }
}
```

## 6B: Sync Status Indicators

### Purpose
Visual indicators on the activity list showing the IATI synchronization status of each activity.

### Components

#### IATISyncStatusIndicator
Full-featured indicator with label and customizable size:
```tsx
<IATISyncStatusIndicator
  syncStatus="live"
  lastSyncTime="2025-01-24T10:00:00Z"
  showLabel={true}
  size="md"
/>
```

#### IATISyncStatusBadge
Compact icon-only version for table cells:
```tsx
<IATISyncStatusBadge 
  syncStatus={activity.syncStatus}
  lastSyncTime={activity.lastSyncTime}
/>
```

### Status Types

1. **🟢 Live** (Green checkmark)
   - Synced within last 24 hours
   - Shows "Last synced X hours ago"

2. **⚠️ Outdated** (Yellow warning)
   - Last sync >24 hours ago
   - Shows "Last synced X days ago"

3. **⛔ Error** (Red X)
   - Sync failed
   - Shows "Sync failed - check IATI identifier"

4. **⏰ Never synced** (Gray clock)
   - Never synchronized with IATI
   - Shows "Never synced with IATI"

### Integration in Activity List

#### Table View
Added new "IATI" column showing sync status icon:
```
| Activity | Status | IATI | Published | ... |
|----------|--------|------|-----------|-----|
| Project1 | Active | 🟢   | ✓         | ... |
| Project2 | Draft  | ⚠️   | ✗         | ... |
```

#### Card View
Sync status badge displayed below activity title:
```
┌─────────────────────┐
│ [Banner Image]      │
├─────────────────────┤
│ Activity Title      │
│ Partner ID          │
│ [🟢 Synced]         │
├─────────────────────┤
│ ...                 │
└─────────────────────┘
```

### Automatic Status Calculation
If `syncStatus` is not provided, the component automatically calculates it based on `lastSyncTime`:
- ≤24 hours → `'live'`
- >24 hours → `'outdated'`
- No timestamp → `'never'`

## Usage Examples

### Using Field Mapper in API Endpoints
```typescript
import { mapIatiToAims, validateIatiData } from '@/lib/iati-field-mapper';

export async function POST(request: Request) {
  const iatiData = await request.json();
  
  // Validate IATI data
  const validation = validateIatiData(iatiData);
  if (!validation.isValid) {
    return Response.json({ 
      error: 'Missing required fields', 
      fields: validation.missingFields 
    }, { status: 400 });
  }
  
  // Convert to AIMS format
  const aimsData = mapIatiToAims(iatiData);
  
  // Save to database
  await saveActivity(aimsData);
}
```

### Using Sync Status in Components
```tsx
import { IATISyncStatusBadge } from '@/components/activities/IATISyncStatusIndicator';

function ActivityRow({ activity }) {
  return (
    <tr>
      <td>{activity.title}</td>
      <td>
        <IATISyncStatusBadge 
          syncStatus={activity.syncStatus}
          lastSyncTime={activity.lastSyncTime}
        />
      </td>
    </tr>
  );
}
```

## Benefits

### Field Mapping Helper
- **Centralized Logic**: All field mappings in one place
- **Type Safety**: TypeScript interfaces for all mappings
- **Bidirectional**: Convert both IATI→AIMS and AIMS→IATI
- **Extensible**: Easy to add new field mappings
- **Validation**: Built-in data validation

### Sync Status Indicators
- **At-a-glance Status**: Quickly see which activities need attention
- **User-friendly**: Intuitive icons and colors
- **Informative**: Hover tooltips show detailed sync information
- **Performance**: Lightweight components with minimal overhead
- **Responsive**: Works in both table and card views

## Future Enhancements

1. **Bulk Operations**: Select multiple activities for batch sync
2. **Sync Filters**: Filter activities by sync status
3. **Sync History**: Track and display sync history for each activity
4. **Custom Field Mappings**: Allow users to define custom field mappings
5. **Sync Notifications**: Alert users when activities need re-syncing 