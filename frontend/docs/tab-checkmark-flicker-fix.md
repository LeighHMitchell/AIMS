# Tab Checkmark Flicker Fix

## Problem
When navigating between tabs in the Activity Editor, the green checkmarks next to Contributors and Organizations tabs would briefly disappear and then reappear. This created a poor user experience and made the interface feel unstable.

## Root Cause
The issue was caused by the async loading pattern in the hooks:

1. **Contributors Tab**: The `useContributors` hook would re-fetch data when the component mounted, causing the contributors array to be temporarily empty during the API call.

2. **Organizations Tab**: The `useParticipatingOrganizations` hook had similar behavior, re-fetching participating organizations on each tab switch.

3. **Tab Completion Logic**: The completion status was calculated based on array length, so when arrays were temporarily empty during loading, the checkmarks would disappear.

## Solution

### 1. Optimistic State Management in Hooks

**useContributors.ts**:
- Added `hasInitiallyLoaded` state to track if data has been loaded before
- Modified `fetchContributors` to accept a `forceRefresh` parameter
- Prevented unnecessary re-fetching when switching tabs
- Only show loading state on initial load or explicit refresh
- Preserve existing data during loading to prevent flicker

**useParticipatingOrganizations.ts**:
- Applied the same optimistic loading pattern
- Added `hasInitiallyLoaded` tracking
- Prevented clearing data during subsequent loads

### 2. Improved Fallback Logic in Components

**ContributorsSection.tsx**:
- Updated the contributor display logic to use `React.useMemo`
- Prioritized showing existing data during loading states
- Changed checkmark logic to show for any contributors (not just accepted ones)

### 3. Stable Tab Completion Hook

Created `useStableTabCompletion.ts`:
- Provides a hook for maintaining stable completion states
- Prevents completion status from changing during loading
- Can be used for future tab completion improvements

## Key Changes

1. **Prevent Unnecessary Re-fetching**: Hooks now track if they've loaded data and avoid re-fetching unless explicitly requested.

2. **Optimistic UI Updates**: Components maintain existing data during loading states instead of showing empty states.

3. **Stable Completion Calculation**: Tab completion status is more stable and doesn't flicker during data loading.

## Benefits

- ✅ Checkmarks no longer disappear when switching tabs
- ✅ Improved perceived performance (no loading flicker)
- ✅ Better user experience with stable UI elements
- ✅ Reduced unnecessary API calls when switching tabs
- ✅ Maintains data consistency during navigation

## Testing

To test the fix:
1. Create an activity with contributors and organizations
2. Navigate between different tabs (especially Contributors and Organizations)
3. Verify that green checkmarks remain stable and don't flicker
4. Check that the completion status is maintained during tab switches

## Future Improvements

The `useStableTabCompletion` hook can be integrated into the main tab completion logic to provide even more stability across all tabs in the Activity Editor.
