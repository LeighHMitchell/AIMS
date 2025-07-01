# Project Timeline Feature (Gantt View)

## Overview
A new **Projects Timeline** tab has been added to the Organisation Profile Page that displays a Gantt-style chart showing all linked projects with their implementation periods.

## Location
- **Page**: `/organizations/[id]` (Organisation Profile Page)
- **Component**: `src/components/organizations/ProjectTimeline.tsx`
- **Tab Position**: Between "Linked Activities" and "Documents" tabs

## Features

### Visual Elements
- **Horizontal Bar Chart**: Each project is represented as a horizontal bar
- **Y-axis**: Project titles (clickable to navigate to activity profile)
- **X-axis**: Timeline showing months/years
- **Color Coding**: Bars are colored based on activity status:
  - 🟢 Green (`#10b981`): Implementation
  - 🔵 Blue (`#3b82f6`): Completion
  - 🟡 Yellow (`#f59e0b`): Pipeline
  - 🔴 Red (`#ef4444`): Cancelled
  - 🔘 Gray (`#6b7280`): Default/Other

### Interactive Features
1. **Clickable Bars**: Click any project bar to navigate to its activity profile
2. **Clickable Titles**: Click project names on Y-axis to open activity details
3. **Hover Tooltips**: Shows:
   - Project title
   - Status badge
   - Organization role (funding/implementing/etc)
   - Start and end dates
   - Duration in days

### Data Requirements
The timeline only displays activities that have both:
- `start_date` (planned or actual start date)
- `end_date` (planned or actual end date)

Activities without complete date information are filtered out.

## Technical Implementation

### Component Props
```typescript
interface ProjectTimelineProps {
  activities: Array<{
    id: string
    iati_id: string
    title: string
    activity_status: string
    role: string
    start_date?: string
    end_date?: string
  }>
}
```

### Technologies Used
- **recharts**: For the bar chart visualization
- **date-fns**: For date calculations and formatting
- **shadcn/ui**: For Card, Badge, and other UI components
- **Next.js routing**: For navigation to activity profiles

### Data Flow
1. Organization profile page fetches linked activities via `/api/activities?organization_id={orgId}`
2. Activities are passed to `ProjectTimeline` component
3. Component filters activities with valid dates
4. Calculates relative positions and durations
5. Renders horizontal stacked bar chart

## Usage Example
```typescript
// In Organization Profile Page
<TabsContent value="timeline" className="mt-6">
  <ProjectTimeline activities={linkedActivities} />
</TabsContent>
```

## Responsive Design
- Chart height: 600px fixed
- Left margin: 200px for project titles
- Bottom margin: 60px for angled date labels
- Responsive container adapts to parent width

## Empty State
When no projects have timeline data, displays:
- Calendar icon
- Message: "No projects with timeline data available"

## Future Enhancements
1. **Export Feature**: Add PNG/SVG/CSV export button
2. **Filtering**: Filter by status, role, or date range
3. **Grouping**: Group projects by status or year
4. **Zoom**: Add zoom controls for large date ranges
5. **Budget Integration**: Show budget amounts on hover or as bar thickness
6. **Milestone Markers**: Add vertical lines for key dates

## API Integration
The component expects activities data from the existing API endpoint:
```
GET /api/activities?organization_id={orgId}
```

No backend changes are required as the endpoint already returns the necessary date fields.

## Performance Considerations
- Uses `useMemo` to optimize timeline data calculations
- Only processes activities with valid dates
- Limits project title length in Y-axis labels (30 chars) 