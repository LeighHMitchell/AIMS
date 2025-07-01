# Linked Activities & Linked Transactions Implementation Guide

## Overview

This guide documents the implementation of two IATI-compliant features:
1. **Linked Activities** - Link activities using IATI's `<related-activity>` element with relationship types 1-5
2. **Linked Transactions** - Display read-only transactions from linked activities

## Database Schema

### 1. Run the SQL Migration

Execute the following SQL script in your Supabase SQL editor:

```sql
-- Run the migration script
-- File: frontend/sql/create_related_activities_table.sql
```

This creates:
- `related_activities` table with circular relationship prevention
- `related_activities_with_details` view for easier querying
- Row Level Security (RLS) policies
- Necessary indexes for performance

## Frontend Components

### 2. Component Structure

The implementation includes the following components:

```
frontend/src/components/activities/
├── LinkedActivitiesTab.tsx    # Main tab for linking activities
├── LinkedActivityModal.tsx     # Modal for selecting relationship types
├── ActivityCard.tsx           # Card component for displaying activities
└── LinkedTransactionsTab.tsx  # Tab for viewing linked transactions
```

### 3. API Routes

```
frontend/src/app/api/activities/[id]/
├── linked/
│   └── route.ts               # GET/POST linked activities
└── linked-transactions/
    └── route.ts               # GET linked transactions
```

## Integration Steps

### 4. Add Tabs to Activity Detail Page

Update your activity detail page to include the new tabs:

```tsx
// In your activity detail page (e.g., activities/[id]/page.tsx)
import LinkedActivitiesTab from '@/components/activities/LinkedActivitiesTab';
import LinkedTransactionsTab from '@/components/activities/LinkedTransactionsTab';

// Add to your tab navigation
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'finances', label: 'Finances' },
  { id: 'linked-activities', label: 'Linked Activities' }, // NEW
  { id: 'linked-transactions', label: 'Linked Transactions' }, // NEW
  // ... other tabs
];

// In your tab content rendering
{activeTab === 'linked-activities' && (
  <LinkedActivitiesTab 
    activityId={activityId} 
    currentUserId={user?.id}
  />
)}

{activeTab === 'linked-transactions' && (
  <LinkedTransactionsTab activityId={activityId} />
)}
```

### 5. Update Stakeholders Tab Structure

If you have a Stakeholders tab, add "Linked Activities" as a sub-tab:

```tsx
// In your Stakeholders component
const stakeholderSubTabs = [
  { id: 'partners', label: 'Partners' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'linked-activities', label: 'Linked Activities' }, // NEW
];
```

## IATI XML Export

### 6. Update XML Export Logic

The IATI XML generator automatically includes related activities:

```tsx
import { generateActivityIATIXML } from '@/lib/iati-xml-generator';

// Export single activity with related activities
const xmlString = await generateActivityIATIXML(activityId);

// Export multiple activities
const xmlString = await generateMultipleActivitiesIATIXML(activityIds);
```

The XML output will include:
```xml
<related-activity type="1" ref="XM-DAC-41114-001" />
<related-activity type="4" ref="EU-2024-001" />
```

## Features & Functionality

### Linked Activities Tab

1. **Search Functionality**
   - Search by UUID, Activity ID, IATI Identifier, or Title
   - Filters out current activity and already linked activities

2. **Linking Process**
   - Select activity from search results
   - Choose relationship type in modal:
     - 1 = Parent
     - 2 = Child
     - 3 = Sibling
     - 4 = Co-funded
     - 5 = Third-party report
   - Confirm with toggle switch

3. **Display Options**
   - Card view (default)
   - List view
   - Grouped by relationship type
   - Shows direction (incoming/outgoing)

4. **Validation**
   - Prevents self-linking
   - Prevents circular relationships
   - Ensures unique relationships

### Linked Transactions Tab

1. **Read-Only Display**
   - Shows all transactions from linked activities
   - Grayed out to indicate read-only status

2. **Features**
   - Currency filtering
   - Transaction type filtering
   - CSV export functionality
   - Summary totals by currency

3. **Information Displayed**
   - Transaction type with icon
   - Amount and currency
   - Provider/Receiver organizations
   - Transaction date
   - Source activity (with link)

## Use Cases

### Multi-Donor Trust Fund
```
DFAT Activity → (type=4) → WB MDTF Activity
FCDO Activity → (type=4) → WB MDTF Activity
EU Activity → (type=4) → WB MDTF Activity
```

### Parent/Child Programme
```
UK Programme → (type=1) → Child Activity 1
UK Programme → (type=1) → Child Activity 2
Child Activity 1 → (type=2) → UK Programme
```

### Co-funded Activities
```
ADB Activity → (type=4) → EU Activity
EU Activity → (type=4) → ADB Activity
```

## Security Considerations

1. **Row Level Security (RLS)**
   - Users can only view linked activities for activities they can access
   - Users can only create links for activities they manage
   - Users can only delete links they created

2. **Validation**
   - Server-side validation of all relationships
   - Prevention of circular dependencies
   - IATI identifier validation

## Performance Optimization

1. **Indexes**
   - On source_activity_id
   - On linked_activity_id
   - On relationship_type
   - On is_external flag

2. **Views**
   - Pre-joined view for common queries
   - Reduces need for multiple queries

## Troubleshooting

### Common Issues

1. **"Circular relationship detected"**
   - The system prevents A→B→A circular links
   - Check existing relationships before linking

2. **"This relationship already exists"**
   - Each relationship type between two activities must be unique
   - Delete existing relationship first if needed

3. **Missing transactions in Linked Transactions tab**
   - Ensure activities are properly linked
   - Check that linked activities have transactions
   - Verify RLS policies allow access

### Database Queries for Debugging

```sql
-- Check all relationships for an activity
SELECT * FROM related_activities_with_details 
WHERE source_activity_id = 'YOUR_ACTIVITY_ID' 
   OR linked_activity_id = 'YOUR_ACTIVITY_ID';

-- Check for circular relationships
WITH RECURSIVE relationship_chain AS (
  SELECT source_activity_id, linked_activity_id, 1 as depth
  FROM related_activities
  WHERE source_activity_id = 'YOUR_ACTIVITY_ID'
  
  UNION ALL
  
  SELECT ra.source_activity_id, ra.linked_activity_id, rc.depth + 1
  FROM relationship_chain rc
  JOIN related_activities ra ON ra.source_activity_id = rc.linked_activity_id
  WHERE rc.depth < 10
)
SELECT * FROM relationship_chain;
```

## Future Enhancements

1. **Bulk Linking**
   - Select multiple activities to link at once
   - Import relationships from CSV

2. **Visualization**
   - Network graph of relationships
   - Hierarchical tree view for parent/child

3. **Advanced Filtering**
   - Filter by relationship type
   - Filter by activity status
   - Date range filters

4. **Notifications**
   - Notify when linked to another activity
   - Alert on circular relationship attempts 