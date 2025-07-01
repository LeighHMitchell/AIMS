# SDG Alignment Feature Implementation

## Overview
This document summarizes the implementation of the SDG (Sustainable Development Goals) alignment feature for the AIMS project, which allows users to map their aid activities to UN SDG goals and targets.

## What Was Implemented

### 1. Database Schema (Supabase)
Three new tables were added to support SDG alignment:

- **sdg_goals**: Stores the 17 UN SDG goals with their names, descriptions, and colors
- **sdg_targets**: Stores the 169 SDG targets linked to their respective goals
- **activity_sdg_mappings**: Links activities to SDG goals/targets with optional contribution percentages and notes

The schema has been added to `frontend/SUPABASE_SETUP_GUIDE.md` and includes:
- Full table definitions
- Indexes for performance
- Row Level Security policies
- Triggers for updated_at timestamps

### 2. Reference Data
Created `sql/populate_sdg_data.sql` with INSERT statements for:
- All 17 SDG goals with official colors
- All 169 SDG targets with descriptions
- Can be run in Supabase SQL editor to populate reference data

### 3. Frontend Components

#### SDGAlignmentSection Component (`frontend/src/components/SDGAlignmentSection.tsx`)
Main component that provides:
- Clickable grid of 17 SDG goal icons
- Target selection via searchable dropdowns
- Optional contribution percentage allocation
- Notes field per target
- Visual summary of selected SDGs
- Two modes: Simple (just tagging) or Percentage (with contribution split)

#### UI Components
- Created `command.tsx` - Command/search component for target selection
- Created `popover.tsx` - Popover wrapper for dropdowns

### 4. Activity Editor Integration
Updated `frontend/src/app/activities/new/page.tsx`:
- Added "SDG Alignment" tab to the sections list
- Added `sdgMappings` state management
- Integrated SDGAlignmentSection component
- SDG mappings are saved/loaded with activity data

### 5. Activity Detail Page
Updated `frontend/src/app/activities/[id]/page.tsx`:
- Added "SDG" tab to display SDG alignment
- Shows visual summary of aligned SDGs with colors
- Lists all selected targets with descriptions
- Shows contribution percentages and notes if provided
- Edit button to modify SDG alignment

### 6. API Integration
Updated `frontend/src/app/api/activities/route.ts`:
- POST endpoint saves SDG mappings when creating/updating activities
- GET endpoint fetches SDG mappings with activity data
- Handles proper data transformation between frontend and database formats

### 7. Data Structure
Created `frontend/src/data/sdg-targets.ts` containing:
- TypeScript interfaces for SDGGoal and SDGTarget
- Complete list of all 17 goals with metadata
- Sample set of SDG targets (expandable to all 169)
- Helper functions for data access

## Usage

### For Users
1. When creating/editing an activity, navigate to the "SDG Alignment" tab
2. Click on SDG goal icons to select relevant goals
3. For each selected goal, use the dropdown to choose specific targets
4. Optionally add notes explaining the alignment
5. In percentage mode, allocate contribution percentages across targets
6. Save the activity to persist SDG mappings

### For Administrators
1. Run the SDG schema SQL in Supabase SQL editor
2. Run the SDG data population script to add all goals and targets
3. Configure contribution mode (simple vs percentage) based on requirements

## Features
- **Visual Interface**: Colorful, clickable SDG icons matching UN branding
- **Search Functionality**: Type-ahead search for targets
- **Flexible Contribution**: Support for both simple tagging and percentage allocation
- **Multi-language Ready**: Structure supports localization
- **Accessibility**: Keyboard navigation and screen reader support
- **Validation**: Ensures contribution percentages sum to 100% when required

## Next Steps
- Add full set of 169 SDG targets to the data file
- Implement SDG filtering in activity search/dashboard
- Add SDG alignment reports and visualizations
- Support bulk SDG tagging for multiple activities
- Add IATI export support for SDG data

## Technical Notes
- SDG colors match official UN hex codes
- Database uses proper foreign key constraints
- Frontend uses TypeScript for type safety
- Components are reusable and configurable
- API properly handles data transformation 