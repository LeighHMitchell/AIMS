# Contribution Heatmap Feature

The contribution heatmap provides a GitHub-style visualization of system activity over the past 12 months, displayed on the dashboard.

## Features

- **Visual Activity Tracking**: Shows daily activity levels with color-coded squares
- **12-Month History**: Displays a full year of contribution data
- **Interactive Tooltips**: Hover over any day to see the exact number of contributions
- **Click Navigation**: Click on any day to view detailed activity logs for that date
- **Activity Filters**:
  - All Activity: Shows all system-wide activity
  - My Activity: Shows only your personal contributions
  - Activities Only: Shows only activity-related actions
  - User Actions: Shows user management actions
  - Transactions: Shows financial transaction actions
- **Statistics Dashboard**:
  - Total actions count
  - Current streak (consecutive days with activity)
  - Longest streak achieved
  - Most active day with contribution count
  - Top 5 most common action types

## Color Coding

The heatmap uses GitHub's color scheme:
- Light gray: No activity
- Light green: 1-5 contributions
- Medium green: 6-10 contributions
- Dark green: 11-19 contributions
- Very dark green: 20+ contributions

## Tracked Actions

The following actions are tracked in the heatmap:

### Activity Management
- Create new activity
- Edit activity
- Delete activity
- Publish activity
- Unpublish activity
- Submit for validation
- Validate activity
- Reject activity

### User & Contact Management
- Add contact
- Remove contact
- Add partner organization
- Update partner organization

### Financial Management
- Add transaction
- Edit transaction
- Delete transaction

## Performance Optimization

The heatmap uses a caching system to ensure fast loading:
- Historical data (before today) is cached daily
- Today's data is fetched in real-time
- Cache is automatically updated via a daily cron job

## Setup Instructions

### 1. Database Migration

Run the migration to create the cache table:

```sql
-- Run the migration file:
frontend/supabase/migrations/create_activity_heatmap_cache.sql
```

### 2. Environment Variables

Add the following to your `.env.local`:

```env
# Secret key for cron job authentication
CRON_SECRET=your-secure-cron-secret-here
```

### 3. Set Up Daily Cron Job

Configure a daily cron job to cache the heatmap data. This can be done using:

#### Option A: Vercel Cron Jobs
Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/activity-logs/cache-heatmap",
    "schedule": "0 2 * * *"
  }]
}
```

#### Option B: External Cron Service
Set up a daily HTTP POST request to:
```
POST /api/activity-logs/cache-heatmap
Authorization: Bearer YOUR_CRON_SECRET
```

#### Option C: GitHub Actions
Create `.github/workflows/cache-heatmap.yml`:

```yaml
name: Cache Heatmap Data
on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM UTC daily
jobs:
  cache:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cache update
        run: |
          curl -X POST https://your-domain.com/api/activity-logs/cache-heatmap \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Usage

The contribution heatmap is automatically displayed on the dashboard page. No additional configuration is needed for users.

### Customization

To modify the heatmap appearance or behavior, edit:
- `frontend/src/components/ContributionHeatmap.tsx` - Component logic
- `frontend/src/app/globals.css` - Styling (search for "Contribution Heatmap Styles")

### API Endpoints

- `GET /api/activity-logs/heatmap` - Fetches heatmap data
  - Query params: `startDate`, `endDate`, `filter`, `userId`
- `POST /api/activity-logs/cache-heatmap` - Updates the cache (requires auth)

## Troubleshooting

### Heatmap not showing data
1. Check if activity logs are being created properly
2. Verify the database connection
3. Check browser console for API errors

### Performance issues
1. Ensure the cache cron job is running
2. Check if indexes are created on the database tables
3. Monitor the cache table size

### Incorrect contribution counts
1. Check timezone settings
2. Verify activity log creation is working
3. Clear cache and regenerate