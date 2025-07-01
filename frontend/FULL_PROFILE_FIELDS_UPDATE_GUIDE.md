# Full Profile Fields & Role Update Guide

## Overview

This guide documents the updates to support full user profile fields and the new role system in the AIMS application.

## 🆕 New User Profile Fields

The following fields have been added to the users table and UI:

- **first_name** (text) - User's first name *[Required]*
- **last_name** (text) - User's last name *[Required]*
- **organisation** (text) - Organization name
- **department** (text) - Department within organization
- **job_title** (text) - User's job title/position
- **telephone** (text) - Phone number *[Required]*
- **website** (text) - Professional website URL
- **mailing_address** (text) - Mailing address

## 🔄 Role System Changes

### Database Values
The system now uses these role values in the database:
- `gov_partner_tier_1`
- `gov_partner_tier_2`
- `dev_partner_tier_1`
- `dev_partner_tier_2`
- `super_user`

### UI Display Labels
These roles are displayed in the UI as:
- "Government User Tier 1"
- "Government User Tier 2"
- "Development Partner Tier 1"
- "Development Partner Tier 2"
- "Super User"

### Migration Notes
- The old `admin` role is automatically migrated to `super_user`
- The old `orphan` role is migrated to `dev_partner_tier_2`
- All role references have been updated throughout the codebase

## 🚀 Setup Instructions

### 1. Apply Database Migration

Run the SQL migration to update your database schema:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d your-database -f frontend/sql/update_users_table_full_profile.sql
```

This migration will:
- Add all new columns to the users table
- Update role constraints
- Migrate existing roles to the new system
- Create sync triggers between users and profiles tables
- Set up proper RLS policies

### 2. Update Environment

No new environment variables are required. The existing Supabase configuration will work.

### 3. Test the Updates

1. Navigate to `/settings` to see the expanded user settings form
2. Test filling out all new fields
3. Verify that role displays correctly
4. Check that validation works for required fields

## 📋 What's Changed

### Settings Page (`/settings`)

The settings page now includes three main sections:

1. **Personal Information**
   - First Name (required)
   - Last Name (required)
   - Email (read-only)
   - Telephone (required)
   - Website (optional)
   - Mailing Address (optional)

2. **Professional Information**
   - Organisation
   - Department
   - Job Title
   - Role (read-only)

3. **IATI Settings**
   - Preferred Language
   - Default Currency
   - Reporting Organisation ID

### Field Validation

- **Required fields**: First name, last name, telephone
- **Phone validation**: Must be valid phone format
- **Website validation**: Must start with http:// or https://
- **IATI org ID**: Must match format like XM-DAC-41114

### Database Changes

1. **Users table**: Added all new profile fields
2. **Profiles table**: Synced with users table via trigger
3. **Role constraint**: Only allows the 5 specified role values
4. **RLS policies**: Users can update their own profile fields but not their role

## 🔐 Security Considerations

- Users cannot change their own role (only super users can)
- Email field remains read-only for security
- All profile updates are logged in activity_logs
- RLS policies ensure data isolation

## 🎨 UI/UX Improvements

- Clean field grouping with icons
- Real-time validation feedback
- Clear error messages
- Professional layout with cards
- Responsive design for mobile

## 🛠️ Technical Details

### Type Definitions

```typescript
interface User {
  // Basic fields
  id: string;
  email: string;
  name: string; // Full name (computed)
  
  // New profile fields
  firstName?: string;
  lastName?: string;
  organisation?: string;
  department?: string;
  jobTitle?: string;
  telephone?: string;
  website?: string;
  mailingAddress?: string;
  
  // Role and status
  role: UserRole;
  isActive: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Role Permissions

The role permissions remain the same:
- **Super User**: Full system access
- **Tier 1 (Gov/Dev)**: Can create and validate activities
- **Tier 2 (Gov/Dev)**: Can create activities only

## 📝 Migration Checklist

- [ ] Back up your database before applying migrations
- [ ] Run the SQL migration script
- [ ] Update any custom role checking code
- [ ] Test user profile updates
- [ ] Verify role displays correctly
- [ ] Check that all validations work
- [ ] Update any documentation referencing old roles

## 🚨 Breaking Changes

1. The `orphan` role no longer exists - migrated to `dev_partner_tier_2`
2. The `admin` role is now `super_user`
3. Role values in the database have changed (but are automatically migrated)

## 🤝 Next Steps

After applying these updates:

1. Inform users about the new profile fields
2. Consider making some fields required based on your needs
3. Update any external integrations that rely on user data
4. Plan for data collection of the new optional fields

## 💡 Tips

- The sync trigger ensures users and profiles tables stay in sync
- Profile pictures still use the separate avatar upload system
- Legacy fields (title, phone) are maintained for backward compatibility
- The system gracefully handles missing optional fields

For any issues or questions, refer to the SQL migration file for detailed implementation notes. 