# Policy Markers Persistence Fix - Testing Guide

## What was Fixed

1. **Added Policy Markers Field Autosave Hook**: Created `/src/hooks/use-policy-markers-autosave.ts`
2. **Updated PolicyMarkersSection**: Added autosave functionality and toast notifications
3. **Fixed Field API Endpoint**: Added support for `policyMarkers` field in `/src/app/api/activities/field/route.ts`
4. **Fixed Comprehensive Autosave**: Ensured policy markers are included in all autosave payloads

## Testing Steps

1. **Navigate to an activity editor** (http://localhost:3002/activities/new?id=85b03f24-217e-4cbf-b8e4-79dca60dee1f)
2. **Go to the Policy Markers tab**
3. **Select a policy marker** and assign it a score (1 or 2)
4. **Wait for the toast notification** - you should see "Policy markers saved" message
5. **Add a rationale** - another save notification should appear
6. **Refresh the page** - the policy marker selection should persist
7. **Navigate away and back** - the selection should still be there

## Expected Behavior

- ✅ Toast notifications appear when policy markers are selected/deselected
- ✅ Toast notifications appear when rationale is added/updated  
- ✅ Policy marker selections persist through page refreshes
- ✅ Policy marker selections persist through navigation
- ✅ Console logs show successful API calls to `/api/activities/field`

## Console Logs to Look For

```
[Field API] Processing policy markers update
[Field API] Policy markers received: [...]
[Field API] Successfully saved X policy markers
[FieldAutosave] Field policyMarkers saved successfully
```

## API Endpoint Test

The field API now supports policy markers. You can test it directly:

```bash
curl -X POST http://localhost:3002/api/activities/field \
  -H "Content-Type: application/json" \
  -d '{
    "field": "policyMarkers", 
    "value": [{"policy_marker_id": "some-id", "score": 2, "rationale": "Test"}],
    "activityId": "85b03f24-217e-4cbf-b8e4-79dca60dee1f",
    "userId": "some-user-id"
  }'
```