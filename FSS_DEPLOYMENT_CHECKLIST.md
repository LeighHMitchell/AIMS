# FSS Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [x] All TypeScript files created without linting errors
- [x] API routes follow established patterns
- [x] Frontend component follows UI/UX conventions
- [x] Database migration scripts reviewed
- [x] No TypeScript compilation errors

### Database
- [ ] Run migration: `20250116000000_add_fss_tables.sql`
- [ ] Verify tables created successfully
- [ ] Verify RLS policies applied
- [ ] Test rollback script (optional, in dev environment)

### API Testing
- [ ] Test GET `/api/activities/[id]/fss` - should return null for new activities
- [ ] Test PUT `/api/activities/[id]/fss` - create FSS
- [ ] Test POST `/api/fss/forecasts` - add forecast
- [ ] Test PUT `/api/fss/forecasts` - update forecast
- [ ] Test DELETE `/api/fss/forecasts` - delete forecast
- [ ] Test DELETE `/api/activities/[id]/fss` - delete FSS (cascades)
- [ ] Test POST `/api/activities/[id]/import-fss` - bulk import

### UI Testing
- [ ] Navigate to Forward Spending Survey tab
- [ ] Create new FSS record
- [ ] Auto-save works on blur
- [ ] Add multiple forecasts
- [ ] Edit existing forecast
- [ ] Delete forecast
- [ ] Currency conversion to USD works
- [ ] Validation errors display correctly
- [ ] Loading states display
- [ ] Empty states display
- [ ] Hero cards show correct totals

### XML Import Testing
- [ ] Upload `test_fss_simple.xml`
- [ ] FSS appears in preview
- [ ] Select FSS for import
- [ ] Import completes successfully
- [ ] Navigate to FSS tab and verify data
- [ ] Upload `test_fss_comprehensive.xml`
- [ ] Test all 8 scenarios
- [ ] Verify priority levels display correctly
- [ ] Verify validation warnings

### Navigation Testing
- [ ] FSS tab appears in Funding & Delivery section
- [ ] FSS tab positioned after Planned Disbursements
- [ ] Tab lazy-loads correctly
- [ ] Clicking tab loads FSS component
- [ ] Navigation state persists

### Validation Testing
- [ ] Required extraction date validation
- [ ] Priority range validation (1-5)
- [ ] Phaseout year range validation (2000-2100)
- [ ] Forecast year range validation
- [ ] Amount non-negative validation
- [ ] Duplicate year detection
- [ ] Currency code validation
- [ ] Form-level validation messages

### Currency Conversion Testing
- [ ] USD to USD (1:1)
- [ ] GBP to USD
- [ ] EUR to USD
- [ ] Other currencies to USD
- [ ] Historical rates via value_date
- [ ] Graceful fallback on conversion errors

### Permission Testing
- [ ] Read-only mode works when user lacks edit permissions
- [ ] Create/edit/delete disabled in read-only mode
- [ ] RLS policies enforced at database level

## Deployment Steps

### 1. Database Migration
```bash
# In Supabase SQL Editor
# Copy and execute: frontend/supabase/migrations/20250116000000_add_fss_tables.sql
```

### 2. Verify Tables Created
```sql
SELECT * FROM forward_spending_survey LIMIT 1;
SELECT * FROM fss_forecasts LIMIT 1;
```

### 3. Deploy Frontend
```bash
cd frontend
npm run build
# Deploy to production
```

### 4. Smoke Test
1. Open production site
2. Navigate to any activity
3. Go to Funding & Delivery → Forward Spending Survey
4. Create simple FSS with 1-2 forecasts
5. Verify save and display

## Post-Deployment Verification

### Functionality Check
- [ ] FSS tab loads without errors
- [ ] Can create FSS record
- [ ] Can add forecasts
- [ ] Can edit forecasts
- [ ] Can delete forecasts
- [ ] Can delete FSS
- [ ] USD conversion works
- [ ] Validation works

### XML Import Check
- [ ] Can import FSS from XML
- [ ] Imported data displays correctly
- [ ] Multiple forecasts import correctly

### Performance Check
- [ ] FSS tab loads quickly (<2s)
- [ ] Forecast operations responsive
- [ ] No console errors
- [ ] Network requests efficient

### Data Integrity Check
```sql
-- Verify constraint works (one FSS per activity)
SELECT activity_id, COUNT(*) 
FROM forward_spending_survey 
GROUP BY activity_id 
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Verify cascade delete works
-- Delete an FSS and verify forecasts also deleted

-- Verify unique year constraint
SELECT fss_id, forecast_year, COUNT(*) 
FROM fss_forecasts 
GROUP BY fss_id, forecast_year 
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

## Rollback Plan

If issues arise:

### 1. Disable FSS Tab (Quick Fix)
Comment out the FSS section in navigation:
```typescript
// { id: "forward-spending-survey", label: "Forward Spending Survey" },
```

### 2. Rollback Database (If Needed)
```bash
# In Supabase SQL Editor
# Execute: frontend/supabase/migrations/20250116000001_rollback_fss_tables.sql
```

### 3. Revert Code Changes
```bash
git revert <commit-hash>
```

## Documentation Checklist

- [x] User guide created (`FSS_USER_GUIDE.md`)
- [x] Technical spec created (`FSS_TECHNICAL_SPEC.md`)
- [x] Implementation summary created (`FSS_IMPLEMENTATION_SUMMARY.md`)
- [x] Deployment checklist created (this file)
- [ ] Update main AIMS documentation to include FSS
- [ ] Add FSS to feature list
- [ ] Update training materials
- [ ] Notify users of new feature

## Support Preparation

### Common Issues & Solutions
1. **"Extraction date is required"**
   - User forgot to enter extraction date
   - Solution: Fill in extraction date field

2. **"A forecast for this year already exists"**
   - Duplicate year entry
   - Solution: Edit existing or delete first

3. **Currency conversion fails**
   - Invalid currency code or date
   - Solution: Check 3-letter ISO code and valid date

4. **FSS tab not visible**
   - Tab may be collapsed or not loaded
   - Solution: Refresh page, check permissions

### Monitoring
- [ ] Set up error tracking for FSS API endpoints
- [ ] Monitor database table growth
- [ ] Track FSS usage metrics
- [ ] Watch for validation errors in logs

## Success Criteria

✅ **All Must Pass**:
- Database migration successful
- No linting or TypeScript errors
- All API endpoints functional
- Frontend component renders correctly
- XML import works
- Validation prevents invalid data
- Currency conversion accurate
- Documentation complete

## Sign-Off

- [ ] Developer: Code review complete, tests passed
- [ ] QA: Functional testing complete, issues resolved
- [ ] Product: Feature meets requirements
- [ ] DevOps: Deployment successful, monitoring active

## Notes

Date: 2025-01-16
Version: 1.0.0
Feature: Forward Spending Survey (FSS) Integration
Status: ✅ READY FOR DEPLOYMENT

---

Last Updated: 2025-01-16

