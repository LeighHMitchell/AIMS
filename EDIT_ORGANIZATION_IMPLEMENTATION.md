# Edit Organization Modal Implementation

## Summary
Successfully implemented a comprehensive tabbed "Edit Organization" modal dialog that works on both:
1. The organization profile page (`/organizations/[id]`)
2. The organizations list page (`/organizations`)

## Changes Made

### 1. Created Edit Organization Modal Component
**File:** `/frontend/src/components/organizations/EditOrganizationModal.tsx`

A comprehensive tabbed edit form modal with drag-and-drop image upload that includes:

#### Tabs:

**1. Basic Info**
  - Organization Name (required)
  - Acronym / Short Name (required)
  - Location Represented (country selector with flags, required)
  - Organization Type (IATI types from API, required)
  - Partner Origin (auto-calculated, read-only)
  - Partner Classification (auto-calculated, read-only)
  - Description (multi-line)

**2. Branding**
  - Logo (drag & drop upload, 512×512px recommended)
  - Banner (drag & drop upload, 1200×300px recommended)
  - Image preview
  - Remove uploaded images

**3. Contact & Social**
  - **Contact Information** (with icons):
    - 📧 Email
    - 📞 Phone
    - 🌐 Website
    - 📍 Mailing Address
  - **Social Media** (with icons):
    - 🐦 Twitter / X
    - 📘 Facebook
    - 💼 LinkedIn
    - 📸 Instagram
    - 🎥 YouTube

**4. Classification**
  - IATI Organization ID (with copy button)
  - Organization UUID (read-only, with copy button)
  - Partner Origin (auto-calculated display)
  - Partner Classification (auto-calculated display)
  - Helpful info box explaining auto-calculations

#### Features:
- ✅ **Tabbed Interface** - Organized into 4 logical sections with consistent height
- ✅ **Drag & Drop Image Upload** - Logo and banner with preview and remove
- ✅ **Myanmar-Specific Logic** - Auto-calculates Partner Origin and Classification
- ✅ **Country Selector** - Dropdown with flag icons for countries and regions
- ✅ **IATI Compliance** - Organization types fetched from API
- ✅ **Social Media Fields** - Twitter, Facebook, LinkedIn, Instagram, YouTube (merged with Contact tab)
- ✅ **Field Icons** - All contact and social media fields have relevant Lucide icons
- ✅ **Copy Buttons** - Quick copy for IATI ID and UUID
- ✅ **Tooltips** - Helpful explanations for auto-calculated fields
- ✅ **Validation** - Required field validation with error banner
- ✅ **Pre-populated Forms** - Loads existing organization data
- ✅ **Auto-refresh** - Updates organization data after save
- ✅ **Delete Option** - Delete button for existing organizations
- ✅ **Loading States** - Visual feedback during save
- ✅ **Modal Dialog** - No page navigation required
- ✅ Toast notifications for success/error feedback

### 2. Updated Organization Profile Page
**File:** `/frontend/src/app/organizations/[id]/page.tsx`

**Changes:**
1. Imported the EditOrganizationModal component
2. Added state management for modal visibility: `const [editModalOpen, setEditModalOpen] = useState(false)`
3. Added `onClick` handler to the "Edit Organization" button to open modal
4. Added modal component to the page with organization data
5. Implemented `handleEditSuccess` callback to refresh organization data after edits

```typescript
// Modal state
const [editModalOpen, setEditModalOpen] = useState(false)

// Button to open modal
<Button 
  className="bg-slate-600 hover:bg-slate-700"
  onClick={() => setEditModalOpen(true)}
>
  <Edit className="h-4 w-4 mr-2" />
  Edit Organization
</Button>

// Modal component
<EditOrganizationModal
  organization={organization}
  open={editModalOpen}
  onOpenChange={setEditModalOpen}
  onSuccess={handleEditSuccess}
/>
```

## Technical Details

### API Integration
- Uses existing PUT endpoint: `/api/organizations/[id]`
- Request body contains organization fields to update
- Returns updated organization data on success

### User Flow
1. User clicks "Edit Organization" button on profile page
2. Modal dialog opens with form pre-populated with current organization data
3. User makes changes to any fields
4. User clicks "Save Changes" or "Cancel"
5. If Save: API request sent to update organization
6. On success: 
   - Toast notification shown
   - Organization data refreshed
   - Modal closes automatically
7. On error: Error toast shown, modal remains open for retry
8. If Cancel: Modal closes without saving changes

### Dependencies Used
- Next.js 14 App Router
- React hooks (useState, useEffect)
- Sonner (toast notifications)
- Shadcn UI components (Dialog, Button, Input, Select, Textarea, Label, ScrollArea)
- Lucide React icons (Building2, Save, Loader2)

## Testing Checklist

To verify the implementation works:

1. ✅ Navigate to any organization profile page
2. ✅ Click the "Edit Organization" button in the top-right
3. ✅ Verify modal opens with edit form
4. ✅ Verify form is pre-populated with organization data
5. ✅ Scroll through the form sections
6. ✅ Make changes to any field
7. ✅ Click "Save Changes"
8. ✅ Verify success toast appears
9. ✅ Verify modal closes automatically
10. ✅ Verify changes are reflected on profile page (data refreshed)
11. ✅ Re-open modal and click "Cancel" to verify it closes without saving

## Code Quality

- ✅ No TypeScript errors
- ✅ No linter errors
- ✅ Follows existing code patterns and conventions
- ✅ Responsive design with grid layout
- ✅ Proper error handling
- ✅ Null-safe implementation
- ✅ Consistent UI/UX with the rest of the application

## Files Created/Modified

### Created:
- `frontend/src/components/organizations/EditOrganizationModal.tsx` - Comprehensive tabbed modal component (1100+ lines)
  - Includes ImageUpload component with drag & drop
  - Myanmar-specific logic functions
  - Country and region data
  - Organization type defaults
  - 5 tabbed sections

- `frontend/sql/add_social_media_columns.sql` - Database migration to add social media columns
  - Adds: social_twitter, social_facebook, social_linkedin, social_instagram, social_youtube

### Modified:
- `frontend/src/app/organizations/[id]/page.tsx`
  - Added import for shared EditOrganizationModal
  - Added modal state management
  - Added onClick handler to button
  - Added modal component to page
  - Added handleEditSuccess callback function
  - Fixed loading state to prevent "Organization not found" flash

- `frontend/src/app/organizations/page.tsx`
  - Added import for shared EditOrganizationModal
  - Removed inline EditOrganizationModal definition (now uses shared component)
  - Re-added DeleteConfirmationModal component
  - Modal usage remains unchanged (same interface)

## Notes

- **Shared Component**: Both pages now use the same `EditOrganizationModal` component from `/components/organizations/`
- **Tabbed Interface**: Organized into 4 tabs for better UX and easier expansion:
  1. Basic Info - Essential identification fields
  2. Branding - Logo and banner image uploads
  3. Contact & Social - Email, phone, website, address, and all social media (with icons)
  4. Classification - IATI IDs and auto-calculated fields
- **Drag & Drop Upload**: Logo and banner images support drag & drop with preview
- **Myanmar-Specific Logic**: Auto-calculates Partner Origin and Classification based on organization type and location
- **Flexible Interface**: The modal supports both callback patterns:
  - `onSave` callback (used by organizations list page)
  - Direct API calls with `onSuccess` callback (used by organization profile page)
- Supports both `isOpen/onClose` and `open/onOpenChange` prop patterns for maximum compatibility
- Image uploads use base64 encoding for direct save (no separate file upload endpoint needed)
- All organization type options fetched from API and follow IATI standards
- Modal automatically refreshes organization data on successful save
- Always opens on "Basic Info" tab for consistency
- No page navigation required - provides better UX
- Field name compatibility: Handles both `organisation_type`/`Organisation_Type_Code` and `country`/`country_represented` naming variations

### Database Migration Required

To use social media fields, run the migration:
```sql
\i frontend/sql/add_social_media_columns.sql
```

This adds the following columns to the `organizations` table:
- `social_twitter`
- `social_facebook`
- `social_linkedin`
- `social_instagram`
- `social_youtube`

