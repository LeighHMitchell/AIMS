# Default Tied Status Implementation

## Summary
Added support for Default Tied Status field to activities, allowing users to set a default tied status that will be automatically applied to new transactions.

## Changes Made

### 1. Database Migration
- Created migration file: `frontend/supabase/migrations/20250116000000_add_default_tied_status.sql`
- Adds `default_tied_status` column to the `activities` table
- Column type: VARCHAR(10) to store the IATI tied status codes

### 2. Frontend Components

#### TiedStatusSelect Component
- Created: `frontend/src/components/forms/TiedStatusSelect.tsx`
- Dropdown component with three options:
  - Code 3: Partially tied
  - Code 4: Tied  
  - Code 5: Untied
- Includes full descriptions for each option

#### FinancesSection Update
- Updated: `frontend/src/components/FinancesSection.tsx`
- Added `defaultTiedStatus` prop and tied status dropdown in the Defaults tab
- Positioned after the Default Currency field

#### Activity Editor Update
- Updated: `frontend/src/app/activities/new/page.tsx`
- Added `defaultTiedStatus` to the general state
- Connected to FinancesSection with proper change handler
- Included in fetchActivity and saveActivity functions

### 3. API Updates
The API routes were already set up to handle `default_tied_status`:
- `POST /api/activities` - Maps defaultTiedStatus to default_tied_status
- `GET /api/activities` - Returns defaultTiedStatus in response
- `GET /api/activities/[id]` - Returns defaultTiedStatus in response

### 4. Field Documentation
- Updated: `frontend/src/components/ActivityFieldHelpers.tsx`
- Added help text for the defaultTiedStatus field

## Testing
Created test script: `frontend/scripts/test-default-tied-status.ts`
- Verifies column exists in database
- Tests updating an activity with default_tied_status
- Confirms API endpoints return the field correctly

## Usage
1. Navigate to any activity in edit mode
2. Go to the Finances section
3. Click on the "Defaults" tab
4. Select a Default Tied Status from the dropdown
5. Save the activity

The selected tied status will be applied as the default for any new transactions created for this activity, though it can be overridden on individual transactions if needed.

## IATI Compliance
This implementation follows IATI standard 2.01.A13 for default tied status values:
- Uses standard IATI tied status codes (3, 4, 5)
- Provides clear descriptions for each option
- Allows override at transaction level 