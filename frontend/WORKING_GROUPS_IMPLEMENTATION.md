# Working Groups Implementation

This document describes the implementation of the Technical/Sector Working Groups feature in the AIMS Activity Editor.

## Overview

The Working Groups feature allows activities to be mapped to predefined Technical Working Groups (TWGs) and Sector Working Groups (SWGs) for better coordination and reporting. This is implemented as a sub-tab under the **Strategic Alignment** section, following IATI Standard 2.03 compliance.

## Technical Architecture

### Database Schema

```sql
-- working_groups table
CREATE TABLE working_groups (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "TWG-Health"
  label VARCHAR(255) NOT NULL,        -- e.g., "Health Technical Working Group"
  sector_code VARCHAR(10),            -- Optional IATI sector code
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- activity_working_groups join table
CREATE TABLE activity_working_groups (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  working_group_id UUID REFERENCES working_groups(id),
  vocabulary VARCHAR(10) DEFAULT '99',  -- IATI custom vocabulary
  created_at TIMESTAMP,
  UNIQUE(activity_id, working_group_id)
);
```

### IATI Compliance

Working groups are stored as IATI tags with `vocabulary="99"` (custom vocabulary):

```xml
<tag vocabulary="99" code="TWG-Gender">
  <narrative>Gender Equality Technical Working Group</narrative>
</tag>
```

## Frontend Components

### WorkingGroupsSection Component

Located at: `frontend/src/components/WorkingGroupsSection.tsx`

Features:
- Multi-select dropdown with grouped working groups
- Displays selected groups as badges
- Handles offline mode when database is unavailable
- Shows IATI compliance information

### Usage in Activity Editor

1. Navigate to Activity Editor → Strategic Alignment → Working Groups
2. Click the dropdown to see available working groups
3. Groups are organized by sector (Health, Education, etc.)
4. Select relevant working groups using checkboxes
5. Selected groups appear as badges below

## Predefined Working Groups

The system includes 19 predefined working groups across various sectors:

### Health Sector
- TWG-Health: Health Technical Working Group
- SWG-HealthFinancing: Health Financing Sub-Working Group
- SWG-ReproductiveHealth: Reproductive Health Sub-Working Group

### Education Sector
- TWG-Education: Education Technical Working Group
- SWG-BasicEducation: Basic Education Sub-Working Group
- SWG-TechVocational: Technical & Vocational Education Sub-Working Group

### Other Sectors
- TWG-Gender: Gender Equality TWG
- TWG-Agriculture: Agriculture & Rural Development TWG
- TWG-WASH: Water, Sanitation & Hygiene TWG
- TWG-PrivateSector: Private Sector Development TWG
- TWG-Trade: Trade & Investment TWG
- TWG-Governance: Good Governance TWG
- TWG-Infrastructure: Infrastructure Development TWG
- TWG-Environment: Environment & Climate Change TWG
- TWG-SocialProtection: Social Protection TWG

### Cross-cutting Groups
- TWG-M&E: Monitoring & Evaluation TWG
- TWG-Coordination: Development Partner Coordination TWG

## API Endpoints

### GET /api/working-groups
Fetches all working groups or filters by:
- `?active=true` - Only active groups
- `?sector=12220` - Groups for specific sector

### POST /api/working-groups
Creates a new working group (admin function)

## Data Flow

1. **Frontend Selection**: User selects working groups in the UI
2. **State Management**: Selections stored as array of `{code, label, vocabulary}`
3. **Save Activity**: Working groups included in activity payload
4. **Backend Processing**: 
   - Maps codes to database IDs
   - Stores in `activity_working_groups` table
   - Returns formatted response with vocabulary="99"

## Benefits

1. **Coordination**: Activities mapped to working groups receive relevant meeting invitations
2. **Reporting**: Easy filtering by working group for sector reports
3. **IATI Compliance**: Follows standard for custom tags
4. **Flexibility**: New working groups can be added by administrators

## Setup Instructions

1. Run the SQL migration:
   ```bash
   psql -d your_database < frontend/sql/create_working_groups_tables.sql
   ```

2. The working groups will be automatically populated from the migration

3. If tables don't exist, the system falls back to the predefined list in `frontend/src/lib/workingGroups.ts`

## Future Enhancements

- Admin UI for managing working groups
- Working group activity dashboards
- Export working group mappings in IATI XML
- Email notifications to working group members 