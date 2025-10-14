# How to Get Your Activity ID

## Quick Method (30 seconds)

### Step 1: Open Your Activity in Activity Editor

Navigate to the activity where contacts are not showing.

### Step 2: Look at the URL

The URL will look like one of these:

**Pattern 1** (editing existing activity):
```
http://localhost:3000/activities/12345678-1234-1234-1234-123456789abc
```

**Pattern 2** (new activity with ID):
```
http://localhost:3000/activities/new?id=12345678-1234-1234-1234-123456789abc
```

### Step 3: Copy the UUID

The UUID is the long string of numbers and letters separated by dashes.

Example: `12345678-1234-1234-1234-123456789abc`

## Alternative Method (Using Browser Console)

If you can't find the UUID in the URL:

1. Open Activity Editor
2. Press **F12** to open DevTools
3. Click **Console** tab
4. Paste this and press Enter:

```javascript
// Get activity ID from URL
const urlMatch = window.location.pathname.match(/\/activities\/([a-f0-9-]+)/);
if (urlMatch) {
  const activityId = urlMatch[1];
  console.log('Your Activity ID:', activityId);
  // Copy to clipboard
  navigator.clipboard.writeText(activityId).then(() => {
    console.log('✅ Copied to clipboard!');
  });
} else {
  // Try query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (id) {
    console.log('Your Activity ID:', id);
    navigator.clipboard.writeText(id).then(() => {
      console.log('✅ Copied to clipboard!');
    });
  } else {
    console.log('❌ Could not find activity ID. Are you on an Activity Editor page?');
  }
}
```

This will:
- Show your activity ID in the console
- **Automatically copy it to your clipboard**

## Using the Activity ID

Once you have your activity ID:

1. Open `fix_contacts_database_issues.sql`
2. Find **ALL** instances of `YOUR-ACTIVITY-ID-HERE`
3. Replace with your actual UUID
4. Run the queries in Supabase

### Example:

**Before**:
```sql
WHERE activity_id = 'YOUR-ACTIVITY-ID-HERE'
```

**After**:
```sql
WHERE activity_id = '12345678-1234-1234-1234-123456789abc'
```

## Quick Find & Replace

Most text editors support Find & Replace:

- **VS Code**: `Cmd+F` (Mac) or `Ctrl+F` (Windows)
- **Supabase SQL Editor**: Use your browser's find (usually `Cmd+F` or `Ctrl+F`)

1. Find: `YOUR-ACTIVITY-ID-HERE`
2. Replace: `your-actual-uuid-here`
3. Replace All

## Troubleshooting

### "Could not find activity ID"

Make sure you are on one of these pages:
- `/activities/[id]`
- `/activities/new?id=[id]`
- `/activities/[id]/edit`

### "Invalid UUID format"

UUIDs look like: `550e8400-e29b-41d4-a716-446655440000`

They have:
- 8 characters
- dash
- 4 characters
- dash
- 4 characters
- dash
- 4 characters
- dash
- 12 characters

If your ID doesn't match this pattern, it might not be a valid UUID.

