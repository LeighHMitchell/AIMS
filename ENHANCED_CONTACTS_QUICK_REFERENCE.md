# Enhanced Contacts - Quick Reference

## For End Users

### Mark a Focal Point

**What**: Designate key contacts responsible for activity oversight

**How**:
1. Edit or add contact
2. Check ☐ **Focal Point for Activity**
3. Save
4. Blue badge appears: **⭐ Focal Point**

**Badge**: Blue with star icon

### Grant Editing Rights

**What**: Allow contacts to edit the activity as contributors

**How**:
1. Edit or add contact
2. Check ☐ **Has Editing Rights**
3. Save
4. Green badge appears: **✏️ Editor**

**Badge**: Green with edit icon

### Link to Existing User

**What**: Connect contact to user account (auto-fills data)

**How**:
1. In contact form, find "Link to Existing User"
2. Type user's name or email (min 2 characters)
3. Select user from dropdown
4. Contact details auto-fill
5. Save

**Result**: ✓ Linked to John Smith (john@example.org)

### Delete a Contact

**What**: Remove contact from activity

**How**:
1. Click Delete (🗑️) button on contact card
2. Wait for "Contact removed" toast
3. Contact disappears permanently

**Note**: Deletion now persists immediately to database!

## For Developers

### New Database Columns

```sql
-- activity_contacts table
is_focal_point BOOLEAN DEFAULT false
has_editing_rights BOOLEAN DEFAULT false
linked_user_id UUID REFERENCES users(id)
```

### API Endpoints

**Search Users**:
```typescript
GET /api/users/search?q=john
// Returns: [{ id, name, email, organization, ... }]
```

**Get Contacts**:
```typescript
GET /api/activities/{activityId}/contacts
// Returns: Contact[] with linked user data
```

**Save Contacts**:
```typescript
POST /api/activities/field
{
  "activityId": "uuid",
  "field": "contacts",
  "value": [{
    firstName: "John",
    lastName: "Smith",
    isFocalPoint: true,
    hasEditingRights: true,
    linkedUserId: "user-uuid"
  }]
}
```

### Contact Interface

```typescript
interface Contact {
  // Core fields
  type: string;
  firstName: string;
  lastName: string;
  position: string;
  
  // IATI fields
  jobTitle?: string;
  department?: string;
  website?: string;
  mailingAddress?: string;
  
  // NEW: Enhanced fields
  isFocalPoint?: boolean;
  hasEditingRights?: boolean;
  linkedUserId?: string;
  linkedUserName?: string;
  linkedUserEmail?: string;
}
```

### Badge Components

```tsx
// Focal Point Badge
{contact.isFocalPoint && (
  <span className="bg-blue-100 text-blue-800 border-blue-200">
    <Star className="fill-blue-600" />
    Focal Point
  </span>
)}

// Editor Badge
{contact.hasEditingRights && (
  <span className="bg-green-100 text-green-800 border-green-200">
    <Edit />
    Editor
  </span>
)}
```

### User Search Component

```tsx
import { UserSearchableSelect } from "@/components/ui/user-searchable-select";

<UserSearchableSelect
  value={contact.linkedUserId}
  onValueChange={(userId, user) => {
    if (user) {
      // Auto-fill contact from user data
      setContact({
        ...contact,
        linkedUserId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      });
    }
  }}
  placeholder="Search users..."
/>
```

## Migration Commands

```bash
# Run the migration
psql $DATABASE_URL -f frontend/supabase/migrations/20250113000000_add_contact_roles.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'activity_contacts' AND column_name IN ('is_focal_point', 'has_editing_rights', 'linked_user_id');"
```

## Testing Checklist

- [ ] Focal point checkbox works
- [ ] Focal point badge appears (blue with star)
- [ ] Editing rights checkbox works
- [ ] Editor badge appears (green with edit icon)
- [ ] User search finds users (min 2 chars)
- [ ] Selecting user auto-fills form
- [ ] User link confirmation shows
- [ ] Contact deletion persists
- [ ] All features work with imported contacts
- [ ] Green tick appears on Contacts tab when contacts exist
- [ ] All data persists after page refresh

## Common Issues

### User Search Returns Empty

**Cause**: Query too short (< 2 characters)
**Fix**: Type at least 2 characters

### Badges Not Showing

**Cause**: Migration not run
**Fix**: Run `20250113000000_add_contact_roles.sql`

### Contact Deletion Not Persisting

**Cause**: API error or no activityId
**Fix**: Check browser console for errors, verify activityId exists

### Auto-Fill Not Working

**Cause**: User object not populated correctly
**Fix**: Check API response from `/api/users/search`

## Keyboard Shortcuts

- **Tab** - Navigate between form fields
- **Enter** - Save contact (when in last field)
- **Escape** - Cancel edit mode
- **Space** - Toggle checkboxes (when focused)

## Visual Hierarchy

1. **Name** - Largest, bold
2. **Badges** - Inline with name, colorful
3. **Position** - Below name, gray
4. **Organization** - Below position, lighter gray
5. **Contact details** - Compact, icon-based

## Badge Colors

- 🟦 **Focal Point**: Blue (`bg-blue-100 text-blue-800`)
- 🟩 **Editor**: Green (`bg-green-100 text-green-800`)
- ⚪ **Status**: Orange (saving), Green (saved)

## Field Labels

- **(IATI)** suffix = IATI-specific field for XML export compliance
- No suffix = General field used both manually and in IATI export

## Best Practices

1. **Always link to user** if contact has a system account
2. **Mark focal points** for activities requiring oversight
3. **Grant editing rights** to active contributors
4. **Fill IATI fields** for compliance and export capability
5. **Use proper contact types** (1=General, 2=Project, 3=Finance, 4=Comms)

