# Linked Activities Implementation

## Overview
This implementation provides a comprehensive, IATI-compliant Linked Activities tab for the AIMS activity editor with the following features:

### Features
1. **Two-Column Layout**
   - Left: Searchable list of all activities in the database
   - Right: Linked activities table and D3 visualization

2. **IATI Compliance**
   - Uses official IATI relationship types (Parent, Child, Sibling, Co-funded, Third Party)
   - Supports narrative descriptions for each link
   - Bidirectional relationship tracking

3. **D3 Force-Directed Graph**
   - Interactive visualization of activity relationships
   - Drag-and-drop node repositioning
   - Tooltips showing full activity details
   - Different arrow types for different relationships
   - Monochrome design matching the UI theme

4. **CRUD Operations**
   - Create new links by selecting from the activity list
   - Edit existing links (relationship type and narrative)
   - Delete links with confirmation
   - Real-time updates via Supabase

5. **Monochrome Design**
   - Consistent grayscale palette using Tailwind CSS
   - Subtle hover effects and transitions
   - Clear visual hierarchy

## Components

### LinkedActivitiesEditorTab
Main component that provides:
- Activity search and filtering
- Link management interface
- Integration with the D3 visualization

### LinkedActivitiesGraph
D3-based force-directed graph that:
- Visualizes the current activity (central node) and its linked activities
- Shows relationship types with arrows
- Provides interactive tooltips
- Supports node dragging

### API Routes
- `GET/POST /api/activities/[id]/linked` - Fetch all links or create new link
- `PUT/DELETE /api/activities/[id]/linked/[linkId]` - Update or delete specific link

## Database Schema
```sql
activity_relationships (
  id UUID PRIMARY KEY,
  activity_id UUID REFERENCES activities(id),
  related_activity_id UUID REFERENCES activities(id),
  relationship_type VARCHAR(10), -- IATI codes: 1-5
  narrative TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Usage
```tsx
<LinkedActivitiesEditorTab
  activityId={activityId}
  currentUserId={userId}
  canEdit={hasEditPermission}
/>
```

## Permissions
- View: All users can view linked activities
- Create/Edit/Delete: Only users with edit permissions on the activity

## Future Enhancements
- Multi-language narrative support
- External activity linking (activities not in the database)
- Bulk operations
- Export visualization as image
- More graph layout options
