# Organization Dropdown Update Summary

## Changes Made

### 1. Organization Dropdown for Super Users
- Super users can now select their organization from a dropdown list
- The dropdown shows:
  - Organization full name
  - Acronym (in parentheses if available)
  - IATI identifier below the name
- Non-super users still see a read-only field

### 2. Default Currency Field Removed
- Removed the default currency field from the IATI Settings section
- Cleaned up all related code:
  - Removed from UserProfile interface
  - Removed from form data initialization
  - Removed from validation
  - Removed from database updates
  - Removed currency imports

### 3. Technical Implementation

#### New State Variables
```typescript
const [organizations, setOrganizations] = useState<Organization[]>([])
const [selectedOrgId, setSelectedOrgId] = useState<string>('')
```

#### Organization Interface
```typescript
interface Organization {
  id: string
  name: string
  acronym?: string
  iati_org_id?: string
}
```

#### Organization Fetching
- Organizations are fetched when the component mounts for super users
- The list is sorted alphabetically by name
- The current user's organization is pre-selected

#### Database Updates
- When a super user changes organization:
  - `organization_id` field is updated with the selected org ID
  - `organisation` field is updated with the organization name

### 4. UI Changes

#### Organization Field (Super Users)
```jsx
<Select value={selectedOrgId} onValueChange={...}>
  <SelectTrigger>
    <SelectValue placeholder="Select organisation" />
  </SelectTrigger>
  <SelectContent>
    {organizations.map((org) => (
      <SelectItem key={org.id} value={org.id}>
        <div className="flex flex-col">
          <div>
            {org.name} {org.acronym && `(${org.acronym})`}
          </div>
          {org.iati_org_id && (
            <div className="text-xs text-muted-foreground">
              IATI: {org.iati_org_id}
            </div>
          )}
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Organization Field (Non-Super Users)
- Remains a disabled input field
- Shows current organization name
- Displays helper text: "Contact your administrator to change your organisation"

### 5. Testing
To test these changes:
1. Log in as a super user
2. Go to Settings page (/settings)
3. In Professional Information section, you should see a dropdown for Organization
4. Select a different organization
5. Save changes
6. The user's organization should be updated in the database

### 6. Database Requirements
Ensure your organizations table has these fields:
- `id` (primary key)
- `name` (organization full name)
- `acronym` (optional)
- `iati_org_id` (optional)

### 7. Notes
- Only super users can change their organization
- The change updates both `organization_id` and `organisation` fields in the users table
- The IATI Settings section now only contains Language and Reporting Org ID fields 