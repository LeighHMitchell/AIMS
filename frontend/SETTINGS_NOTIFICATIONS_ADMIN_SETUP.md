# Settings, Notifications & Admin Pages Setup Guide

## Overview

This guide covers the implementation and setup of three key pages:
- `/settings` - User Settings Page
- `/notifications` - Notifications Page  
- `/admin` - Admin Panel (Super User only)

## 🚀 Quick Setup

### 1. Install Required Dependencies

```bash
cd frontend
npm install zod date-fns
```

### 2. Set Up Database Tables

Run the SQL migration file to create the necessary tables:

```bash
# Apply the database schema
psql -h your-supabase-host -U postgres -d your-database -f frontend/sql/create_user_profiles_notifications.sql
```

### 3. Configure Supabase Storage

Create a bucket for user avatars in your Supabase dashboard:

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `avatars`
3. Set it as public (for avatar URLs to work)
4. Add the following policies:
   - Upload: `auth.uid() IS NOT NULL`
   - Delete: `auth.uid() = owner_id`

## 📋 Features Implemented

### User Settings Page (`/settings`)

✅ **Profile Management**
- Full name, phone, position editing with validation
- Profile picture upload with Supabase Storage integration
- Real-time validation feedback
- Loading states and error handling

✅ **IATI Settings**
- ISO 639-1 language selection dropdown
- ISO 4217 currency selection with all official currencies
- IATI organization ID with format validation
- Persistent storage in Supabase profiles table

✅ **Security**
- Row Level Security (RLS) enabled
- Users can only edit their own profile
- Super users can view all profiles

### Notifications Page (`/notifications`)

✅ **Two-Tab Interface**
- **Mentions Tab**: Shows @username mentions in comments
- **System Tab**: Activity validation status, rejections, info requests

✅ **Features**
- Real-time updates via Supabase subscriptions
- Mark as read/unread functionality
- Batch mark all as read
- Relative timestamps (e.g., "2 hours ago")
- Activity reference links
- Unread notification badges
- Refresh functionality

✅ **Database Integration**
- Automatic notification creation on mentions
- Activity status change notifications
- Indexed for performance

### Admin Panel (`/admin`)

✅ **Access Control**
- Restricted to super_user role only
- Automatic redirect for unauthorized users
- Security checks at component level

✅ **User Management Tab**
- Search by name, email, or organization
- Filter by role or organization
- Display full user details with last login
- Responsive table with loading states
- Error handling with fallback to demo data

✅ **Placeholder Tabs**
- IATI Import Logs (ready for implementation)
- Pending Validations (ready for implementation)

## 🔐 Security Implementation

### Row Level Security (RLS) Policies

**Profiles Table:**
```sql
-- Users can only view/edit their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Super users can view all profiles
CREATE POLICY "Super users can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_user'
  ));
```

**Notifications Table:**
```sql
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

### Frontend Security Checks

```typescript
// Role-based route protection
const canAccess = currentUser?.role === USER_ROLES.SUPER_USER
if (!canAccess) {
  router.push("/")
}

// Component-level access control
if (!canAccess) {
  return <AccessDeniedComponent />
}
```

## 🎨 UI/UX Improvements

### Form Validation
- Real-time field validation
- Clear error messages
- Disabled submit when errors exist
- Loading states during submission

### Responsive Design
- Mobile-friendly layouts
- Overflow handling on tables
- Adaptive card layouts
- Touch-friendly interaction areas

### Loading & Error States
- Skeleton loaders for better perceived performance
- Error boundaries with fallback UI
- Retry mechanisms for failed requests
- Optimistic updates for better UX

## 🔄 Real-time Features

### Notifications Subscription
```typescript
const channel = supabase
  .channel('notifications_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe()
```

## 🏗️ Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  profile_picture_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  default_currency TEXT DEFAULT 'USD',
  reporting_org_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT CHECK (type IN ('mention', 'system')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_id UUID,
  activity_title TEXT,
  related_user_id UUID,
  related_user_name TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP
);
```

## 🛠️ Remaining Tasks

### Frontend
- [ ] Replace mock validation with proper Zod schemas
- [ ] Add user creation/editing modals in admin panel
- [ ] Implement IATI import logs functionality
- [ ] Add pending validations queue
- [ ] Create notification preferences settings

### Backend
- [ ] Set up Supabase Edge Functions for complex operations
- [ ] Add email notification system
- [ ] Implement audit logging for admin actions
- [ ] Create background jobs for notification cleanup

### Testing
- [ ] Add unit tests for validation functions
- [ ] Create E2E tests for critical user flows
- [ ] Test RLS policies thoroughly
- [ ] Performance testing for large datasets

## 📝 Code Quality Improvements

1. **Type Safety**: All components use TypeScript with proper interfaces
2. **Error Handling**: Comprehensive try-catch blocks with user-friendly messages
3. **Loading States**: Consistent loading indicators across all async operations
4. **Validation**: Input validation with clear error messages
5. **Accessibility**: ARIA labels, keyboard navigation support
6. **Performance**: Debounced validation, optimistic updates, efficient queries

## 🚨 Important Notes

1. **Supabase Configuration**: The app gracefully falls back to local storage/mock data when Supabase is not configured
2. **Security**: Always verify user permissions server-side, not just client-side
3. **Storage**: Ensure Supabase Storage bucket policies are correctly configured
4. **Real-time**: Real-time subscriptions require Supabase Realtime to be enabled
5. **Migrations**: Always backup your database before running migrations

## 🤝 Contributing

When adding new features:
1. Follow the existing patterns for error handling and loading states
2. Ensure proper TypeScript types are defined
3. Add appropriate security checks
4. Update this documentation
5. Test with and without Supabase configured 