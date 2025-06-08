# GPEDC Form - Quick Start Guide

## 🚀 Getting Started

The GPEDC form has been successfully implemented in your AIMS system! Here's how to use it:

### 1. Access the Form

Navigate to: `/activities/gpedc`

Or add a link from your activities/projects pages:

```tsx
<Link href="/activities/gpedc?projectId=123">
  Fill GPEDC Monitoring Form
</Link>
```

### 2. Key Features Available Now

✅ **All Form Sections**
- Output 1: Development Effectiveness Indicators
- Output 2: Government Systems
- Output 3: Budget Planning
- Contact Details
- Document Uploads
- Remarks

✅ **Smart Features**
- Auto-save every 30 seconds
- Real-time validation
- Organization dropdown (pulls from your database)
- Phone number formatting
- PDF file upload
- Tooltips on every field
- Light/dark mode support

✅ **Dynamic Logic**
- When "No" is selected for government systems, follow-up "Why not?" fields appear
- When final evaluation is planned, date picker appears
- Form validates that at least one question per output is answered

### 3. Test the Form

1. Go to `/activities/gpedc`
2. Fill in some test data
3. Notice the auto-save indicator in the top right
4. Try selecting "No" for government systems to see dynamic fields
5. Submit the form to see validation in action

### 4. Form Data Structure

The form collects data in this structure:

```json
{
  "developmentEffectiveness": {
    "implementingPartner": "org-id",
    "linkedToGovFramework": "yes",
    "supportsPublicSector": "no",
    "numberOfOutcomeIndicators": 5,
    "indicatorsFromGovPlans": "yes",
    "indicatorsMonitoredByGov": "yes",
    "finalEvaluationPlanned": "yes"
  },
  "governmentSystems": {
    "budgetExecutionSystem": "no",
    "financialReportingSystem": "yes",
    "auditingSystem": "yes",
    "procurementSystem": "no"
  },
  "budgetPlanning": {
    "annualBudgetShared": "yes",
    "threeYearPlanShared": "no",
    "tiedStatus": "untied"
  },
  "contact": {
    "name": "John Doe",
    "organisation": "org-id",
    "email": "john@example.com",
    "phoneNumber": "+855 23 456 789"
  },
  "documents": {
    "uploadedFile": null,
    "externalLink": "https://example.com/doc.pdf"
  },
  "remarks": "Additional notes...",
  "dynamicFields": {
    "budgetExecutionReason": "Using donor procedures",
    "procurementReason": "Special requirements",
    "evaluationDate": "2025-12-31"
  }
}
```

### 5. Next Steps for Full Integration

To save form data to your database:

1. **Create Database Table**

```sql
CREATE TABLE gpedc_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  form_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

2. **Update the Save Function**

In `GPEDCForm.tsx`, update the `saveFormData` function:

```typescript
const saveFormData = async (data: ExtendedGPEDCFormData) => {
  const { error } = await supabase
    .from('gpedc_forms')
    .upsert({
      project_id: projectId,
      form_data: data,
      status: data.metadata?.status || 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('project_id', projectId);
    
  if (error) {
    console.error('Save error:', error);
    throw error;
  }
};
```

3. **Add to Navigation**

Add a menu item or button to access the form:

```tsx
// In your navigation component
<Link href="/activities/gpedc">
  GPEDC Monitoring
</Link>
```

### 6. Customization Options

**Change Tooltips**: Edit `/lib/gpedc-tooltips.ts`

**Add Validation Rules**: Edit `/lib/gpedc-validation.ts`

**Modify Styling**: Use Tailwind classes in the component

**Add Fields**: Extend the `GPEDCFormData` type and add new form fields

### 7. Testing Checklist

- [ ] Form loads without errors
- [ ] Organizations dropdown populates
- [ ] Auto-save works (check console logs)
- [ ] Validation prevents submission with missing required fields
- [ ] Dynamic fields appear when conditions are met
- [ ] Phone number formats correctly
- [ ] PDF upload accepts only PDF files
- [ ] Form submission shows success message

### 8. Troubleshooting

**Organizations not loading?**
- Check Supabase connection
- Verify `organizations` table has data
- Check browser console for errors

**Auto-save not working?**
- Check console for error messages
- Verify the save endpoint is configured

**Validation errors?**
- Required fields: Contact Name, Organisation, Email
- At least one answer per output section required

### 9. Support

For issues or questions:
1. Check browser console for errors
2. Review the full documentation in `GPEDC_FORM_IMPLEMENTATION.md`
3. Verify all dependencies are installed
4. Check that Supabase environment variables are set

The form is now ready to use! Navigate to `/activities/gpedc` to see it in action.