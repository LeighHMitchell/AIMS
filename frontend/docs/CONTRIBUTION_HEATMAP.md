# Contribution Heatmap Feature

## Overview

The contribution heatmap is a GitHub-style visualization that displays system activity over the past 12 months on the dashboard. It provides a quick visual representation of daily activity patterns and engagement levels.

## Features

### Visual Display
- **Grid Layout**: 52 weeks (columns) × 7 days (rows)
- **Color Intensity**: 5 levels representing activity volume
  - Gray: No activity
  - Light green: 1-2 activities
  - Medium-light green: 3-5 activities
  - Medium green: 6-10 activities
  - Dark green: 11+ activities
- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Colors adjust for dark theme

### Activity Tracking
The heatmap tracks the following actions:
- Activity creation and editing
- Publishing activities
- Partner management (add/update)
- Transaction management
- Validation submissions and approvals

### Summary Statistics
Above the heatmap, users can see:
- **Total Contributions**: Sum of all activities in the period
- **Active Days**: Number of days with at least one activity
- **Current Streak**: Consecutive days of activity (including today)
- **Max Streak**: Longest consecutive period of activity

### User Permissions
- **Super Users**: See all system-wide activity
- **Organization Users**: See activity filtered by their organization
- **Filter Toggle**: Option to switch between "All Activity" and "My Activity"

## Technical Implementation

### Backend API
- **Endpoint**: `/api/contributions`
- **Method**: GET
- **Query Parameters**:
  - `userId`: Filter by specific user
  - `userRole`: User's role for permission filtering
  - `filter`: 'all' or 'user' to control data scope

### Frontend Component
- **Location**: `/components/ContributionHeatmap.tsx`
- **Library**: `react-calendar-heatmap`
- **Styling**: Custom CSS in `globals.css`

### Data Aggregation
- Activity logs are aggregated by date
- Results are cached to minimize database queries
- Daily refresh ensures up-to-date information

## Usage

### Adding to Dashboard
```tsx
import { ContributionHeatmap } from "@/components/ContributionHeatmap"

// In your dashboard component
<ContributionHeatmap filterType="all" />
```

### Seeding Test Data
For development and testing:
```bash
npm run seed:activity-logs
```

This will generate realistic activity data for the past year.

## Future Enhancements

1. **Click Interaction**: Click on a day to see detailed activities
2. **Export Feature**: Download contribution data as CSV
3. **Custom Date Ranges**: Allow users to select different time periods
4. **Activity Type Filtering**: Show heatmap for specific action types
5. **Team Comparisons**: Compare contribution patterns across teams
6. **Milestone Markers**: Highlight important dates or releases

## Troubleshooting

### No Data Showing
1. Check if there are activity logs in the database
2. Verify user permissions are correctly set
3. Ensure the API endpoint is accessible

### Styling Issues
1. Make sure `react-calendar-heatmap/dist/styles.css` is imported
2. Check that custom CSS classes are properly defined
3. Verify Tailwind classes are being applied

### Performance
- For large datasets, consider implementing server-side caching
- Limit the number of concurrent API requests
- Use database indexes on `created_at` and `user_id` columns