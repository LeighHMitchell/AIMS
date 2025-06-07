# GPEDC Form Implementation Guide

## Overview

The GPEDC (Global Partnership for Effective Development Co-operation) form is a comprehensive data entry system designed for development partners to enter detailed information aligned with GPEDC monitoring indicators.

## Features Implemented

### ✅ Core Features

1. **ShadCN UI Components**
   - Radio groups for Yes/No questions
   - Select dropdowns for organization selection
   - Input fields with validation
   - Tooltips for contextual help
   - Cards and sections for layout
   - Tabs for section navigation

2. **Responsive Layout**
   - Mobile-friendly design
   - Grouped sections with Cards
   - Professional spacing with Tailwind CSS
   - Light/dark mode support

3. **Auto-Save Functionality**
   - Saves every 30 seconds automatically
   - Saves on field blur with 1-second debounce
   - Visual indicator showing save status
   - Manual save draft button

4. **Form Validation**
   - Required field validation
   - Email format validation
   - Phone number formatting and validation
   - URL validation for external links
   - Section-level validation (at least one answer per output)

### 🎯 Bonus Features

1. **Draft Mode & Auto-Save**
   - Form data persists as draft before submission
   - Timestamp showing last saved time
   - Save indicator with animation

2. **Validation System**
   - Real-time field validation
   - Error messages below fields
   - Section-level validation alerts
   - Submit button disabled until valid

3. **Export Functionality**
   - PDF export button (ready for implementation)
   - Snapshot generation capability

4. **Inline Navigation**
   - Sticky tabs for quick section navigation
   - 6 sections: Output 1-3, Contact, Documents, Remarks

5. **Dynamic Logic**
   - Follow-up questions when "No" is selected for government systems
   - Evaluation date input when final evaluation is planned

6. **GPEDC Compliance Badge**
   - Visual indicator showing alignment with indicators 5, 6, 9, and 10

7. **Configurable Tooltips**
   - All tooltips stored in central configuration file
   - Easy to update without modifying components

## File Structure

```
frontend/src/
├── components/
│   ├── GPEDCForm.tsx                 # Main form component
│   └── GPEDCDynamicFeatures.tsx     # Dynamic follow-up questions
├── types/
│   └── gpedc.ts                      # TypeScript types
├── lib/
│   ├── gpedc-tooltips.ts            # Tooltip configurations
│   └── gpedc-validation.ts          # Validation functions
├── hooks/
│   └── useAutoSave.ts               # Auto-save hook
└── app/
    └── activities/
        └── gpedc/
            └── page.tsx             # Example page implementation
```

## Usage Example

```tsx
import { GPEDCForm } from '@/components/GPEDCForm';
import { GPEDCFormData } from '@/types/gpedc';

export default function MyPage() {
  const handleSubmit = async (data: GPEDCFormData) => {
    // Save to your backend
    await saveToDatabase(data);
  };

  return (
    <GPEDCForm
      projectId="project-123"
      currentUser={{
        id: 'user-123',
        name: 'John Doe',
        role: 'partner'
      }}
      onSubmit={handleSubmit}
      initialData={existingData} // Optional
    />
  );
}
```

## Form Sections

### 1. Output 1: Development Effectiveness Indicators
- Implementing Partner (dropdown)
- Linked to Government Framework (Yes/No)
- Supports Public Sector (Yes/No)
- Number of Outcome Indicators (number input)
- Indicators from Government Plans (Yes/No)
- Indicators Monitored by Government (Yes/No)
- Final Evaluation Planned (Yes/No)
  - If Yes: Shows date picker for planned date

### 2. Output 2: Government Systems
- Budget Execution System (Yes/No)
- Financial Reporting System (Yes/No)
- Auditing System (Yes/No)
- Procurement System (Yes/No)
- If any is "No": Shows optional text area asking "Why not?"

### 3. Output 3: Budget Planning
- Annual Budget Shared (Yes/No)
- 3-Year Plan Shared (Yes/No)
- Tied Status (Fully Tied/Partially Tied/Untied)

### 4. Contact Details
- Contact Name* (required)
- Organisation* (required, dropdown)
- Email* (required, validated)
- Phone Number (optional, formatted)

### 5. Project Documents
- PDF Upload (drag & drop or click)
- External Document Link (URL)

### 6. Remarks
- Multi-line text area for additional notes

## Data Structure

The form data follows this structure:

```typescript
interface GPEDCFormData {
  developmentEffectiveness: {
    implementingPartner?: string;
    linkedToGovFramework?: 'yes' | 'no';
    // ... other fields
  };
  governmentSystems: {
    budgetExecutionSystem?: 'yes' | 'no';
    // ... other fields
  };
  budgetPlanning: {
    annualBudgetShared?: 'yes' | 'no';
    // ... other fields
  };
  contact: {
    name?: string;
    organisation?: string;
    email?: string;
    phoneNumber?: string;
  };
  documents: {
    uploadedFile?: File | null;
    externalLink?: string;
  };
  remarks?: string;
  metadata?: {
    projectId: string;
    lastSavedAt?: Date;
    submittedAt?: Date;
    status: 'draft' | 'submitted' | 'published';
    createdBy: string;
    updatedBy?: string;
  };
}
```

## Customization

### Updating Tooltips

Edit `frontend/src/lib/gpedc-tooltips.ts` to modify tooltip text:

```typescript
export const gpedcTooltips = {
  developmentEffectiveness: {
    implementingPartner: "Your new tooltip text here"
  }
  // ... other tooltips
};
```

### Adding Validation Rules

Edit `frontend/src/lib/gpedc-validation.ts` to add custom validation:

```typescript
// Add your custom validation logic
if (customCondition) {
  errors['fieldName'] = 'Custom error message';
}
```

### Styling

The form uses Tailwind CSS classes. To customize:
- Modify component className props
- Update theme in `tailwind.config.js`
- Override CSS variables in `globals.css`

## Future Enhancements

1. **Multi-language Support**
   - Integrate with i18n library
   - Store translations in separate files
   - Language switcher component

2. **Audit Trail**
   - Log all form changes to database
   - Track user, timestamp, and changes
   - Display change history

3. **PDF Export**
   - Integrate with PDF generation library (e.g., react-pdf)
   - Generate formatted PDF with all form data
   - Include GPEDC compliance statement

4. **Field-Level History**
   - Show last edited by and timestamp on hover
   - Display change history for each field
   - Revert to previous values

## Integration with AIMS

To integrate with your existing AIMS system:

1. Add GPEDC form route to your navigation
2. Link from project/activity pages
3. Store form data in your database
4. Add permissions for who can fill the form
5. Include in reporting dashboards

## Database Schema (Suggested)

```sql
CREATE TABLE gpedc_forms (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  
  -- Development Effectiveness
  implementing_partner UUID REFERENCES organizations(id),
  linked_to_gov_framework BOOLEAN,
  supports_public_sector BOOLEAN,
  num_outcome_indicators INTEGER,
  indicators_from_gov_plans BOOLEAN,
  indicators_monitored_by_gov BOOLEAN,
  final_evaluation_planned BOOLEAN,
  evaluation_planned_date DATE,
  
  -- Government Systems
  budget_execution_system BOOLEAN,
  budget_execution_reason TEXT,
  financial_reporting_system BOOLEAN,
  financial_reporting_reason TEXT,
  auditing_system BOOLEAN,
  auditing_reason TEXT,
  procurement_system BOOLEAN,
  procurement_reason TEXT,
  
  -- Budget Planning
  annual_budget_shared BOOLEAN,
  three_year_plan_shared BOOLEAN,
  tied_status VARCHAR(20),
  
  -- Contact
  contact_name VARCHAR(255) NOT NULL,
  contact_organisation UUID REFERENCES organizations(id) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  
  -- Documents
  document_url TEXT,
  external_link TEXT,
  
  -- Metadata
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Support

For questions or issues with the GPEDC form implementation:
1. Check the console for error messages
2. Verify all required packages are installed
3. Ensure Supabase is properly configured
4. Check that organizations table is populated

The form is designed to be extensible and maintainable, following React best practices and modern UI/UX patterns.