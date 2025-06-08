# Integration Example: Adding Strategies Tab to Partner Profiles

## 🔗 **Adding Strategies Tab to Partner Profile Page**

Here's how to integrate the new Strategies functionality into existing partner profile pages:

### **1. Import the StrategiesTab Component**

```typescript
// In your partner profile component file (e.g., partners/[id]/page.tsx)
import StrategiesTab from '@/components/StrategiesTab';
```

### **2. Add Strategies Tab to Navigation**

```typescript
// Update your tabs configuration
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-6"> {/* Updated from grid-cols-5 */}
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activities">Activities</TabsTrigger>
    <TabsTrigger value="finances">Finances</TabsTrigger>
    <TabsTrigger value="contacts">Contacts</TabsTrigger>
    <TabsTrigger value="strategies">Strategies</TabsTrigger> {/* NEW TAB */}
    <TabsTrigger value="documents">Documents</TabsTrigger>
  </TabsList>

  {/* Existing tabs... */}

  {/* NEW: Strategies Tab Content */}
  <TabsContent value="strategies">
    <StrategiesTab
      organizationId={partner.id}
      organizationName={partner.name}
      isPublicView={!user || !userCanEdit}
      userCanEdit={userCanEdit}
    />
  </TabsContent>
</Tabs>
```

### **3. Update Permission Logic (if needed)**

```typescript
// Determine if user can edit strategies
const userCanEdit = useMemo(() => {
  if (!user) return false;
  
  // Super users and government users can edit all
  if (user.role === 'super_user' || user.role === 'government_user') {
    return true;
  }
  
  // Check if user belongs to this organization
  return user.organizations?.some(org => org.id === partner.id);
}, [user, partner.id]);
```

## 🗄️ **Database Migration Instructions**

### **Apply the Migration**

1. **Option A: Via Supabase Dashboard**
   ```sql
   -- Copy and paste the contents of this file into Supabase SQL Editor:
   -- frontend/supabase/migrations/20250605_create_development_strategies_table.sql
   ```

2. **Option B: Via Command Line (if you have direct database access)**
   ```bash
   psql -d your_database_name -f frontend/supabase/migrations/20250605_create_development_strategies_table.sql
   ```

### **Verify Migration Success**

```sql
-- Check if table was created successfully
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'development_strategies';

-- Check if policies were created
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'development_strategies';
```

## 🧪 **Testing Your Integration**

### **Test Checklist**

1. **Public View Testing**
   - [ ] Visit partner profile without logging in
   - [ ] Verify only "Strategies" tab shows published strategies
   - [ ] Confirm no "Add Strategy" buttons are visible
   - [ ] Check that internal/draft strategies are hidden

2. **Organization Member Testing**
   - [ ] Log in as organization member
   - [ ] Verify "Add Strategy" button appears
   - [ ] Test creating a new published strategy
   - [ ] Test creating a draft strategy
   - [ ] Confirm draft strategies are visible but marked as internal

3. **Permission Testing**
   - [ ] Test with super_user role
   - [ ] Test with government_user role  
   - [ ] Test with regular user from different organization
   - [ ] Verify edit/delete buttons appear only for authorized users

4. **Functionality Testing**
   - [ ] Test file upload (PDF and Word documents)
   - [ ] Test different date formats (full date, year, month-year)
   - [ ] Test adding thematic pillars and languages
   - [ ] Test Gantt chart visualization
   - [ ] Test public link functionality

## 🎨 **UI Customization Options**

### **Custom Styling**

```typescript
// You can customize the appearance by passing additional props
<StrategiesTab
  organizationId={partner.id}
  organizationName={partner.name}
  isPublicView={!user || !userCanEdit}
  userCanEdit={userCanEdit}
  className="custom-strategies-tab" // Custom CSS class
  theme="compact" // Optional: compact or full
/>
```

### **Custom Empty State**

```typescript
// The component automatically handles empty states, but you can customize the message
// by modifying the StrategiesTab component directly
```

## 📱 **Mobile Considerations**

The Strategies tab is fully responsive and mobile-friendly:

- **Touch-optimized buttons** for mobile interactions
- **Collapsible timeline view** on smaller screens  
- **Swipe-friendly card layouts** for strategy lists
- **Mobile-optimized form inputs** with appropriate keyboards

## 🔄 **API Integration Examples**

### **Fetching Strategies Programmatically**

```typescript
// Get all public strategies for an organization
const publicStrategies = await fetch(
  `/api/strategies?organizationId=${orgId}&publicOnly=true`
);

// Get all strategies (requires authentication)
const allStrategies = await fetch(
  `/api/strategies?organizationId=${orgId}&userId=${userId}`
);

// Create a new strategy
const newStrategy = await fetch('/api/strategies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: orgId,
    userId: userId,
    title: 'My New Strategy',
    documentType: 'Bilateral Partnership Plan',
    status: 'Published',
    // ... other fields
  })
});
```

## 🚀 **Production Deployment**

### **Pre-Deployment Checklist**

1. **Database**
   - [ ] Migration applied successfully
   - [ ] Row-level security policies active
   - [ ] Indexes created for performance

2. **File Storage**
   - [ ] Supabase Storage bucket configured
   - [ ] File upload policies set
   - [ ] CDN configured (optional)

3. **Security**
   - [ ] API endpoints secured
   - [ ] User permissions tested
   - [ ] File type validation working

4. **Performance**
   - [ ] Database queries optimized
   - [ ] Component lazy loading (if needed)
   - [ ] Image/file compression enabled

### **Monitoring & Analytics**

```sql
-- Monitor strategy creation rates
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as strategies_created,
  COUNT(CASE WHEN public = true THEN 1 END) as public_strategies
FROM development_strategies 
GROUP BY month 
ORDER BY month DESC;

-- Track overdue strategies
SELECT 
  o.name as organization,
  ds.title,
  ds.expected_publication_date,
  ds.status
FROM development_strategies ds
JOIN organizations o ON ds.organization_id = o.id
WHERE ds.expected_publication_date < NOW() 
  AND ds.status != 'Published'
ORDER BY ds.expected_publication_date;
```

## 💡 **Advanced Features (Optional)**

### **Email Notifications**
- Set up cron jobs to check for overdue strategies
- Send email reminders for upcoming publication dates
- Notify government users of new consultation-stage strategies

### **Bulk Import**
- Create CSV/Excel import functionality
- Batch upload multiple strategies
- Data validation and error reporting

### **Version Control**
- Track strategy document versions
- Show revision history
- Compare different versions

The Strategies tab is now ready for production use and will provide a comprehensive tool for tracking development partnership strategies! 🎉 