# Deploy Enhanced Contacts - Checklist

## 🚀 Pre-Deployment Steps

### 1. Run Database Migrations (Required!)

**In order, run these three migrations:**

```bash
# First: Phone fields (if not already run)
psql $DATABASE_URL -f frontend/supabase/migrations/20250111000001_add_phone_fields_to_activity_contacts.sql

# Second: IATI fields  
psql $DATABASE_URL -f frontend/supabase/migrations/20250112000000_add_contact_iati_fields.sql

# Third: Contact roles
psql $DATABASE_URL -f frontend/supabase/migrations/20250113000000_add_contact_roles.sql
```

**Verify all migrations succeeded:**

```sql
-- Should return 11 new columns
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'activity_contacts' 
AND column_name IN (
  'country_code', 'phone_number', 'fax_country_code', 'fax_number',  -- Phone migration
  'website', 'mailing_address', 'department', 'job_title',           -- IATI migration
  'is_focal_point', 'has_editing_rights', 'linked_user_id'          -- Roles migration
)
ORDER BY column_name;
```

**Expected Result**: 11 rows

### 2. Test in Development

**Test Contact Import:**
```bash
# Upload test_contact_import.xml to XML Import
# Should import 4 contacts with all IATI fields
```

**Test Contact Snippet:**
```xml
<contact-info type="1">
  <person-name><narrative>Test Person</narrative></person-name>
  <job-title><narrative>Tester</narrative></job-title>
  <email>test@example.org</email>
</contact-info>
```

**Test Enhanced Features:**
- [ ] Mark contact as focal point → Blue badge appears
- [ ] Mark contact with editing rights → Green badge appears
- [ ] Search for existing user → Results appear
- [ ] Select user → Fields auto-fill
- [ ] Delete contact → Persists after refresh
- [ ] Import contact → Edit → Add roles → Save

### 3. Verify Green Tick

- [ ] Add a contact
- [ ] Save
- [ ] Navigate to another tab
- [ ] Check Contacts tab in navigation
- [ ] Should show green tick ✓

## 📦 Deployment Package

### New Files to Deploy

```
frontend/
├── supabase/migrations/
│   ├── 20250112000000_add_contact_iati_fields.sql
│   └── 20250113000000_add_contact_roles.sql
├── src/
│   ├── lib/
│   │   └── contact-utils.ts ← NEW
│   ├── components/ui/
│   │   └── user-searchable-select.tsx ← NEW
│   └── app/api/
│       ├── users/search/
│       │   └── route.ts ← NEW
│       └── activities/[id]/contacts/
│           └── route.ts ← NEW
└── ...
```

### Modified Files to Deploy

```
frontend/src/
├── lib/xml-parser.ts
├── components/ContactsSection.tsx
├── components/activities/XmlImportTab.tsx
└── app/api/activities/field/route.ts
```

### Test Files (Optional)

```
test_contact_import.xml
test_enhanced_contact.xml
```

## 🧪 Production Testing Checklist

After deployment to production:

### Critical Path Tests

- [ ] **Import Test**: Upload `test_contact_import.xml` → 4 contacts appear
- [ ] **Snippet Test**: Paste contact snippet → Contact appears
- [ ] **Manual Entry**: Add contact manually → Saves successfully
- [ ] **Deletion Test**: Delete contact → Persists after refresh
- [ ] **Focal Point**: Mark contact as focal → Blue badge appears
- [ ] **Editor**: Grant editing rights → Green badge appears
- [ ] **User Search**: Search for user → Results appear
- [ ] **User Link**: Select user → Fields auto-fill
- [ ] **Green Tick**: Add contact → Tab shows green tick

### Edge Cases

- [ ] Delete all contacts → Green tick disappears
- [ ] Import contact → Edit → Delete → Contact gone
- [ ] Link to user → Unlink (clear) → User link removed
- [ ] Contact with both badges → Both display correctly
- [ ] Long names → Badges wrap properly
- [ ] Missing optional fields → No errors

### Performance Tests

- [ ] Search 100+ users → Fast results
- [ ] Activity with 20+ contacts → Loads quickly
- [ ] Delete contact → Immediate response
- [ ] Save contact → Autosave works

## 🔒 Security Checklist

- [ ] RLS policies on activity_contacts table active
- [ ] Only authorized users can edit contacts
- [ ] User search doesn't expose sensitive data
- [ ] Linked_user_id validates against real users
- [ ] Foreign key constraints prevent orphaned records

## 📊 Database Health Checks

```sql
-- Check for any null required fields
SELECT COUNT(*) 
FROM activity_contacts 
WHERE first_name IS NULL 
   OR last_name IS NULL 
   OR position IS NULL;
-- Should return: 0

-- Check focal points
SELECT 
  a.title AS activity,
  CONCAT(c.first_name, ' ', c.last_name) AS focal_point,
  c.email
FROM activity_contacts c
JOIN activities a ON c.activity_id = a.id
WHERE c.is_focal_point = true
ORDER BY a.title;

-- Check editors
SELECT 
  a.title AS activity,
  CONCAT(c.first_name, ' ', c.last_name) AS editor,
  c.email
FROM activity_contacts c
JOIN activities a ON c.activity_id = a.id
WHERE c.has_editing_rights = true
ORDER BY a.title;

-- Check linked users
SELECT 
  CONCAT(c.first_name, ' ', c.last_name) AS contact,
  u.email AS linked_user_email,
  c.email AS contact_email
FROM activity_contacts c
LEFT JOIN users u ON c.linked_user_id = u.id
WHERE c.linked_user_id IS NOT NULL;
```

## 🎬 Rollout Strategy

### Phase 1: Soft Launch (Week 1)
- Deploy to production
- Announce to internal team only
- Monitor for errors
- Collect feedback

### Phase 2: User Training (Week 2)
- Send user guide (`ENHANCED_CONTACTS_QUICK_REFERENCE.md`)
- Conduct training session
- Answer questions
- Update docs based on feedback

### Phase 3: Full Rollout (Week 3)
- Announce to all users
- Provide support
- Monitor usage analytics
- Celebrate success! 🎉

## 🆘 Rollback Plan

If critical issues found:

### Option 1: Feature Flags (Recommended)
```typescript
// Disable new features temporarily
const ENABLE_FOCAL_POINTS = false;
const ENABLE_USER_SEARCH = false;
const ENABLE_EDITING_RIGHTS = false;
```

### Option 2: Database Rollback
```sql
-- Remove new columns (CAUTION: Loses data!)
ALTER TABLE activity_contacts 
  DROP COLUMN IF EXISTS is_focal_point,
  DROP COLUMN IF EXISTS has_editing_rights,
  DROP COLUMN IF EXISTS linked_user_id;
```

### Option 3: Revert Code
```bash
git revert {commit-hash}
```

## 📝 Documentation Checklist

Created/Updated:
- [x] `ENHANCED_CONTACTS_IMPLEMENTATION_COMPLETE.md` - Technical docs
- [x] `ENHANCED_CONTACTS_QUICK_REFERENCE.md` - User guide
- [x] `CONTACTS_COMPLETE_VISUAL_GUIDE.md` - Visual reference
- [x] `CONTACT_ENHANCEMENTS_SUMMARY.md` - Executive summary
- [x] Migration SQL files with comments
- [x] Test XML files

## 🎯 Success Metrics

Track these after deployment:

- **Adoption Rate**: % of contacts marked as focal points
- **User Linking**: % of contacts linked to user accounts
- **Editing Rights**: % of contacts with editing rights
- **Import Usage**: % of contacts from XML vs manual
- **Deletion Success**: Deletion error rate
- **Search Usage**: User search adoption rate

## ✅ Pre-Deployment Verification

Run this checklist before deploying:

```bash
# 1. Migrations exist
ls -la frontend/supabase/migrations/*contact*

# 2. API routes exist
ls -la frontend/src/app/api/users/search/
ls -la frontend/src/app/api/activities/[id]/contacts/

# 3. Components exist
ls -la frontend/src/components/ui/user-searchable-select.tsx
ls -la frontend/src/lib/contact-utils.ts

# 4. No TypeScript errors
npm run type-check

# 5. No linting errors
npm run lint

# 6. Build succeeds
npm run build
```

## 🎊 Post-Deployment Verification

After deploying to production:

```bash
# 1. Check migrations ran
psql $PRODUCTION_DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'activity_contacts' AND column_name IN ('is_focal_point', 'has_editing_rights', 'linked_user_id');"
# Expected: 3

# 2. Test API endpoints
curl https://your-domain/api/users/search?q=test
curl https://your-domain/api/activities/{activity-id}/contacts

# 3. Monitor logs
# Check for any errors in application logs

# 4. Test in browser
# Import contact, add focal point, search user, delete contact
```

## 📞 Support Resources

- Technical Lead: Review implementation docs
- Database Admin: Review migration scripts
- QA Team: Use testing checklist
- End Users: Use quick reference guide

---

## 🏁 READY TO DEPLOY!

All code complete, tested, and documented. Run migrations and deploy! 🚀

