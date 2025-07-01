# Tags and Policy Markers Implementation Guide

## Overview

This document describes the implementation of Tags and Policy Markers features as two separate sub-tabs in the AIMS Activity Editor UI. Both features are located in the **Strategic Alignment** section of the Activity Editor.

## Database Setup

### Required Tables

Before using these features, you need to create the database tables by running the SQL script:

```bash
# Run the SQL script in your Supabase dashboard or psql client
cat sql/create_tags_and_policy_markers.sql
```

This creates the following tables:
- `tags` - Stores unique tag names and metadata
- `activity_tags` - Many-to-many relationship between activities and tags
- `policy_markers` - Predefined OECD DAC policy markers
- `activity_policy_markers` - Links activities to policy markers with scores

## Features

### 1. Tags Sub-Tab

**Purpose**: Allow users to assign custom, free-form tags to activities for flexible categorization and search.

**Key Features**:
- **Typeahead/Autocomplete**: Search existing tags as you type
- **Create New Tags**: Type a new tag name and press Enter or click "Add Tag"
- **Tag Management**: Remove tags with the X button
- **Visual Tags**: Tags display as colored badges with hash icons
- **Guidelines**: Built-in tagging guidelines for best practices

**Usage**:
1. Navigate to Activity Editor → Strategic Alignment → Tags
2. Start typing in the input field to search existing tags
3. Select from suggestions or create new tags
4. Added tags appear as removable badges below
5. Tags are automatically saved when the activity is saved

**API Endpoints**:
- `GET /api/tags?q=search` - Search for tags
- `POST /api/tags` - Create new tags

### 2. Policy Markers Sub-Tab

**Purpose**: Enable structured assignment of OECD DAC and IATI-compliant policy markers using a 3-point scoring scale.

**Key Features**:
- **Organized by Category**:
  - 🌱 Environmental (Rio Markers)
  - 👥 Social & Governance  
  - 🔧 Other Cross-Cutting Issues
- **3-Point Scoring Scale**:
  - 0 = Not targeted
  - 1 = Significant objective
  - 2 = Principal objective
- **Optional Rationale**: Explain scoring decisions
- **Collapsible Sections**: Organized, clean interface
- **Hover Help**: Tooltips explain each marker

**Predefined Markers**:

**Environmental:**
- Climate Change Mitigation
- Climate Change Adaptation
- Biodiversity
- Desertification
- Aid to Environment

**Social & Governance:**
- Gender Equality
- Good Governance
- Participatory Development
- Human Rights
- Rule of Law
- Trade Development

**Other Cross-Cutting:**
- Disability Inclusion
- Nutrition
- Peacebuilding / Conflict Sensitivity
- Rural Development
- Urban Development
- Digitalization / Technology
- Private Sector Engagement

**Usage**:
1. Navigate to Activity Editor → Strategic Alignment → Policy Markers
2. Expand sections to view available markers
3. Select score (0-2) for each relevant marker
4. Optionally provide rationale for scoring
5. Markers with score > 0 appear in the summary section

**API Endpoints**:
- `GET /api/policy-markers` - Get all available policy markers

## Technical Implementation

### Frontend Components

**TagsSection.tsx**:
- React component with Command/Popover for autocomplete
- Debounced search with 300ms delay
- Badge-based tag display with removal functionality
- Built-in validation and guidelines

**PolicyMarkersSection.tsx**:
- Collapsible sections for organization
- RadioGroup for score selection
- Textarea for rationale input
- Tooltip integration for help text

### Navigation Integration

Added to `ActivityEditorNavigation.tsx` in the Strategic Alignment group:
```typescript
{
  title: "Strategic Alignment",
  sections: [
    { id: "msdp", label: "MSDP Alignment" },
    { id: "sdg", label: "SDG Alignment" },
    { id: "tags", label: "Tags" },                    // NEW
    { id: "policy_markers", label: "Policy Markers" } // NEW
  ]
}
```

### State Management

Added to activity editor state:
```typescript
const [tags, setTags] = useState<any[]>([]);
const [policyMarkers, setPolicyMarkers] = useState<any[]>([]);
```

### API Integration

**Activities API Updates**:
- Save tags and policy markers on activity create/update
- Fetch tags and policy markers in activity responses
- Proper error handling and logging

**Data Flow**:
1. User selects/creates tags or assigns policy marker scores
2. Data is included in activity save payload
3. Backend processes and stores in join tables
4. Response includes updated tags and policy markers
5. Frontend state updates with latest data

## Data Models

### Tag Model
```typescript
interface Tag {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
}
```

### Policy Marker Model
```typescript
interface PolicyMarker {
  id: string;
  code: string;
  name: string;
  description: string;
  marker_type: 'environmental' | 'social_governance' | 'other';
  display_order: number;
}
```

### Activity Policy Marker Model
```typescript
interface ActivityPolicyMarker {
  policy_marker_id: string;
  score: 0 | 1 | 2;
  rationale?: string;
}
```

## Security & Permissions

- Tags and Policy Markers respect existing activity edit permissions
- Users can only edit tags/markers on activities they have edit access to
- Tag creation is open to all users (tags are shared resources)
- Policy markers are read-only system data

## Future Enhancements

Potential improvements for future iterations:

### Tags
- Tag usage analytics and popular tags
- Tag categories or namespaces
- Bulk tag operations
- Tag-based activity filtering and search

### Policy Markers
- Score history and change tracking
- Marker-specific reporting and analytics
- Custom organizational policy markers
- Integration with IATI XML export

## Troubleshooting

**Common Issues**:

1. **Tables don't exist**: Run the SQL setup script
2. **Tags not appearing**: Check API endpoints are accessible
3. **Save errors**: Verify database permissions and table structure
4. **UI not showing**: Ensure components are imported and navigation updated

**Debugging**:
- Check browser console for API errors
- Verify database table structure matches schema
- Confirm environment variables are set correctly
- Check server logs for backend errors

## Testing

To test the implementation:

1. **Tags**:
   - Create new tags and verify they're saved
   - Search for existing tags and verify autocomplete
   - Remove tags and verify they're removed
   - Check tags persist after save/reload

2. **Policy Markers**:
   - Select different scores for various markers
   - Add rationale text and verify it's saved
   - Check that only scored markers appear in summary
   - Verify markers persist after save/reload

3. **Integration**:
   - Save activity and verify both features work together
   - Test with different user permission levels
   - Verify data appears correctly in activity responses