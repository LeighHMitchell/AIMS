# Supabase User Menu Integration Guide

This guide explains how to integrate the SidebarUserMenu component with real Supabase authentication.

## Current Implementation

The user menu currently works with mock authentication stored in localStorage. The component is fully functional and ready for Supabase integration.

## Integration Steps

### 1. Update User Type to Include Avatar

Add an avatar field to your User type in `types/user.ts`:

```typescript
export interface User {
  // ... existing fields
  avatar?: string; // URL to user's avatar image
}
```

### 2. Fetch Real User Data from Supabase

Update the `useUser` hook to fetch real user data:

```typescript
// In useUser.tsx
import { supabase } from '@/lib/supabase'

// Inside UserProvider
useEffect(() => {
  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Fetch additional user data from your users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUser(profile)
      }
    }
    setIsLoading(false)
  }
  
  getUser()
}, [])
```

### 3. Handle Real Logout

Update the logout function to use Supabase:

```typescript
const logout = async () => {
  await supabase.auth.signOut()
  handleSetUser(null)
  router.push('/login')
}
```

### 4. Add Real Navigation Routes

Update the menu items in `SidebarUserMenu.tsx` to navigate to real pages:

```typescript
// Example for User Settings
onClick: () => {
  setIsOpen(false)
  router.push('/profile/settings')
}

// Example for Notifications
onClick: () => {
  setIsOpen(false)
  router.push('/notifications')
}
```

### 5. Add Avatar Upload Support

If you want to support avatar uploads:

```typescript
// Add this to your user settings page
const uploadAvatar = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(`${user.id}/${file.name}`, file)
  
  if (data) {
    const avatarUrl = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path).data.publicUrl
    
    // Update user profile with avatar URL
    await supabase
      .from('users')
      .update({ avatar: avatarUrl })
      .eq('id', user.id)
  }
}
```

## Role-Based Features

The menu already supports role-based menu items:

- **Super Users**: See "Admin Panel"
- **Organization Users**: See "My Organisation"
- **Government Users**: See "Ministry Dashboard"

To add more role-specific features, update the `menuItems` array in `SidebarUserMenu.tsx`.

## Styling Customization

The component uses Tailwind CSS classes. To customize:

1. **Avatar colors**: Change the `bg-indigo-600` class
2. **Dropdown position**: Adjust the `bottom-full` and `mb-2` classes
3. **Menu animations**: Modify the `slideUp` animation in `globals.css`

## Testing

To test the component with different user roles:

```typescript
// In your test or development environment
const testUsers = {
  superUser: {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "super_user",
    // ... other fields
  },
  orgUser: {
    id: "2",
    name: "Org User",
    email: "org@example.com",
    role: "dev_partner_tier_1",
    organizationId: "org-123",
    // ... other fields
  }
}

// Set a test user
setUser(testUsers.superUser)
``` 