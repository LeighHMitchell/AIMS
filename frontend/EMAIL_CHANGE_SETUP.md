# Email Change Feature Setup

This guide explains how to use the email change feature in the AIMS project.

## Overview

The email change feature allows super users to update their email addresses directly within the application. The system has been designed to work in two modes:

1. **With Supabase**: Full authentication integration
2. **Without Supabase**: Local database mode for development/testing

## Setup Options

### Option 1: Using Supabase (Recommended for Production)

1. Create a `.env.local` file in the frontend directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Get these values from your Supabase dashboard:
   - Go to Settings → API
   - Copy the URL and keys

3. Ensure email changes are enabled in Supabase:
   - Go to Authentication → Settings
   - Enable "Allow users to change their email address"

### Option 2: Local Development Mode (No Supabase Required)

If you don't have Supabase configured, the system will automatically use a local database fallback.

1. The system will use an in-memory database for testing
2. Email changes will be stored locally
3. Perfect for development and testing

## Using the Email Change Feature

1. **Access the Profile Page**:
   - Click on your profile or navigate to "My Profile"

2. **Enter Edit Mode**:
   - Click the "Edit Profile" button

3. **Change Email**:
   - In edit mode, click the "Change Email" button next to the email field
   - Enter your new email address
   - Confirm the new email address
   - Click "Change Email" to save

## How It Works

### With Supabase:
- Updates both the authentication system and database
- Email is immediately changed
- User can log in with new email

### Without Supabase (Local Mode):
- Updates only the local database
- Changes persist in browser storage
- Suitable for testing UI and workflows

## Testing the Feature

For local testing without Supabase:

```bash
# Start the development server
npm run dev

# The system will automatically detect if Supabase is not configured
# and use the local database mode
```

## Troubleshooting

### "Failed to update authentication email"
- This usually means Supabase is not configured
- The system will fall back to local mode automatically

### "Email change is currently unavailable"
- Check that your environment variables are set correctly
- Ensure the `.env.local` file is in the frontend directory

### Email doesn't change after update
- In local mode, changes are stored in browser storage
- Clear browser data if you need to reset

## Security Notes

- Only users with the "super_user" role can change emails
- Email format validation is enforced
- Duplicate email addresses are prevented

## API Endpoints

- **Production**: `/api/users/change-email` (requires Supabase)
- **Simplified**: `/api/users/change-email-simple` (works without Supabase)

The system automatically uses the appropriate endpoint based on your configuration.
