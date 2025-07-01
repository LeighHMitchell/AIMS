# Rolodex Setup Instructions

The Rolodex feature requires a database view to be created. If you're seeing "Internal server error" on the Rolodex page, follow these steps:

## Setup Instructions

1. **Open Supabase SQL Editor**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor

2. **Run the SQL Script**
   - Copy the entire contents of `create_unified_rolodex_view.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify the Setup**
   - The script creates:
     - A view called `person_unified_view` that combines users and activity contacts
     - A function called `search_unified_rolodex` for efficient searching
     - Necessary indexes for performance
   - You should see success messages for each operation

4. **Test the Rolodex**
   - Navigate to `/rolodex` in your application
   - The page should now load without errors

## What the Rolodex Shows

The Rolodex provides a unified view of all people in the system:
- **System Users**: People with login accounts
- **Activity Contacts**: People associated with specific activities

## Fallback Behavior

If the database view is not set up, the API will automatically fall back to showing only system users. This ensures the page remains functional even without the full setup.

## Troubleshooting

If you still see errors after running the SQL:
1. Check the browser console for specific error messages
2. Verify the view was created: `SELECT * FROM person_unified_view LIMIT 1;`
3. Check permissions are granted: The SQL script includes GRANT statements

## Note

The Rolodex view needs to be created once per database. If you're using multiple environments (dev, staging, prod), you'll need to run the SQL script in each environment.