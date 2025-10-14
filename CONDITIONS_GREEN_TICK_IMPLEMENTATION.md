# Conditions Tab Green Tick Implementation

## Summary

Added green tick indicator to the Conditions tab in the activity editor that appears when one or more conditions are saved.

## Changes Made

### 1. Added Conditions Count State
**File**: `frontend/src/app/activities/new/page.tsx`

Added state to track the number of conditions:
```typescript
const [conditionsCount, setConditionsCount] = useState<number>(0);
```

### 2. Fetch Conditions Count on Activity Load
**File**: `frontend/src/app/activities/new/page.tsx` (around line 2860)

Added logic to fetch conditions when the activity loads:
```typescript
// Fetch conditions for tab completion status
try {
  const { data: conditionsData, error: conditionsError } = await supabase
    .from('activity_conditions')
    .select('id')
    .eq('activity_id', activityId);
  
  if (!conditionsError && conditionsData) {
    console.log('[AIMS] Loaded conditions for tab completion:', conditionsData.length);
    setConditionsCount(conditionsData.length);
  }
} catch (error) {
  console.warn('[AIMS] Failed to load conditions for tab completion:', error);
}
```

### 3. Added Conditions to Tab Completion Status
**File**: `frontend/src/app/activities/new/page.tsx` (around line 3238)

Added conditions to the `tabCompletionStatus` object:
```typescript
conditions: {
  isComplete: conditionsCount > 0,
  isInProgress: false
},
```

### 4. Added conditionsCount to Dependencies
**File**: `frontend/src/app/activities/new/page.tsx` (line 3264)

Added `conditionsCount` to the `useMemo` dependency array so the tab status updates when the count changes.

### 5. Real-time Updates When Conditions Change
**File**: `frontend/src/app/activities/new/page.tsx` (around line 1767)

Added callback to ConditionsTab to update count in real-time:
```typescript
<ConditionsTab 
  activityId={general.id} 
  readOnly={!permissions?.canEditActivity}
  defaultLanguage="en"
  onConditionsChange={(conditions) => {
    setConditionsCount(conditions.length);
  }}
/>
```

## How It Works

1. **On Activity Load**: When an activity is loaded, the system fetches the count of conditions from the database
2. **Tab Completion Calculation**: The tab completion status includes conditions, marking it as complete if `conditionsCount > 0`
3. **Real-time Updates**: When conditions are added, edited, or deleted via the ConditionsTab component, the `onConditionsChange` callback updates the count immediately
4. **Green Tick Display**: The activity editor navigation automatically shows a green tick for any tab where `isComplete: true`

## Result

- ✅ Green tick appears on Conditions tab when at least one condition exists
- ✅ Green tick disappears when all conditions are deleted
- ✅ Updates in real-time as conditions are added/removed
- ✅ Consistent with other tabs (Contacts, Documents, etc.)

## Testing

1. Navigate to any activity
2. Go to Conditions tab
3. Add a condition (select type and enter description)
4. Click "Save Condition"
5. **Observe**: Green tick appears on the Conditions tab in the navigation
6. Delete the condition
7. **Observe**: Green tick disappears

The green tick indicator works just like other tabs in the activity editor!

