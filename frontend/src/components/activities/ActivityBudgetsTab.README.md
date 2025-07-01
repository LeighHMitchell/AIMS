# ActivityBudgetsTab Component

## Overview

The `ActivityBudgetsTab` component is an IATI-compliant budget management interface for the Aid Information Management System (AIMS). It provides a comprehensive solution for entering, viewing, and managing activity budgets with automatic period generation, granularity switching, and real-time autosaving.

## Key Features

### 1. **Hero Cards Dashboard**
- **Total Budget**: Sum of all budget entries with currency
- **Time Coverage**: Date range showing first to last budget period
- **Budget Status**: Breakdown of indicative vs committed budgets
- **Currencies**: List of currencies used across all budgets

### 2. **Granularity Switching**
- **Quarterly** (default): Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
- **Monthly**: Individual months
- **Annual**: Full years
- Automatically generates budget periods based on activity dates
- Regenerates table when switching granularity

### 3. **Auto-Generation**
- On first load, automatically creates budget rows for the entire activity period
- Uses the selected granularity (quarterly by default)
- Ensures no period exceeds 12 months (IATI compliance)
- Adjusts final period to match activity end date

### 4. **Real-time Autosaving**
- Every field change is automatically saved after 500ms
- No save buttons required
- Visual feedback with loading spinner
- Optimistic UI updates

### 5. **Budget Exception Handling**
- "Budget not provided" toggle for activities without budget data
- Reason textarea for explaining why budget is unavailable
- Stored in separate `activity_budget_exceptions` table

### 6. **IATI 2.03 Compliance**
- Original (1) / Revised (2) budget types
- Indicative (1) / Committed (2) budget status
- Non-overlapping periods
- Maximum 12-month periods
- Proper value dates

### 7. **Budget Visualization Charts**
- **Period Budget Chart**: Line chart showing budget values for each period
- **Cumulative Budget Chart**: Line chart showing running total over time
- Charts automatically adapt to selected granularity (quarterly/monthly/annual)
- Interactive tooltips showing exact values
- Responsive design for mobile and desktop
- Built with Recharts for smooth interactions

## Component Props

```typescript
interface ActivityBudgetsTabProps {
  activityId: string;        // UUID of the activity
  startDate: string;         // Activity start date (YYYY-MM-DD)
  endDate: string;           // Activity end date (YYYY-MM-DD)
  defaultCurrency?: string;  // Default currency code (e.g., "USD")
}
```

## Usage

```tsx
import ActivityBudgetsTab from '@/components/activities/ActivityBudgetsTab';

<ActivityBudgetsTab 
  activityId="123e4567-e89b-12d3-a456-426614174000"
  startDate="2024-01-01"
  endDate="2026-12-31"
  defaultCurrency="USD"
/>
```

## Component Layout

```
┌────────────────────────────────────┐
│  🟦 Hero Card 1: Total Budget       │
│  🟩 Hero Card 2: Time Coverage      │
│  🟨 Hero Card 3: Budget Status      │
│  🟥 Hero Card 4: Currencies         │
├────────────────────────────────────┤
│  Granularity: [Quarterly] [Monthly] [Annual]  │
│        Budget Table (editable)     │
│   [ rows for each budget period ]  │
├────────────────────────────────────┤
│   📊 Line Charts: Budget over Time  │
│   ┌────────────┬──────────────┐    │
│   │  Period Totals (line)     │    │
│   │  Cumulative Total (line)  │    │
│   └────────────┴──────────────┘    │
└────────────────────────────────────┘
```

## Database Schema

### Table: `activity_budgets`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| activity_id | uuid | References activities(id) |
| type | smallint | 1 = Original, 2 = Revised |
| status | smallint | 1 = Indicative, 2 = Committed |
| period_start | date | Budget period start date |
| period_end | date | Budget period end date |
| value | numeric | Budget amount (≥ 0) |
| currency | varchar(3) | ISO 4217 currency code |
| value_date | date | Date of budget value |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Last update time |

### Table: `activity_budget_exceptions`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| activity_id | uuid | References activities(id) |
| reason | text | Explanation for missing budget |
| created_at | timestamp | Record creation time |

## Behavior

### Period Generation Logic
1. Based on activity start/end dates and selected granularity
2. Quarterly: 3-month periods aligned to calendar quarters
3. Monthly: Individual calendar months
4. Annual: Calendar years (capped at 12 months if needed)

### Total Calculation
- Prioritizes revised budgets over original
- If any revised budgets exist, sums only revised values
- Otherwise, sums original values
- Displayed below the table with currency

### Validation Rules
- No overlapping periods allowed
- Maximum one original and one revised budget per period
- Each period must be ≤ 12 months
- Value must be ≥ 0
- All dates required

### User Actions
- **Switch Granularity**: Changes period breakdown (requires confirmation)
- **Edit Fields**: Automatic save on blur
- **Delete**: Removes budget entry (with confirmation)
- **Duplicate**: Copies budget with shifted dates
- **Duplicate Forward**: Creates next period based on current granularity with same values
- **Add Custom Period**: Manually add non-standard periods

## Styling

The component uses Tailwind CSS with a clean, minimal design:
- No custom colors or gradients
- Consistent spacing with grid layouts
- Subtle borders and shadows
- Focus on usability and clarity

## Accessibility

- Keyboard navigation support
- Clear labels and form associations
- Loading states announced to screen readers
- Error messages displayed prominently

## Error Handling

- Network errors displayed in alert banner
- Field-level validation feedback
- Optimistic updates with rollback on failure
- Graceful handling of missing data

## Performance Considerations

- Debounced autosaving (500ms delay)
- Optimistic UI updates
- Minimal re-renders
- Efficient date calculations with date-fns
- Memoized calculations for hero stats and chart data

## Migration Guide

To set up the required database tables, run the provided SQL migration:

```sql
-- See create_activity_budgets_tables.sql
```

## Future Enhancements

1. Bulk import/export functionality
2. Currency conversion display
3. Budget variance analysis
4. Historical budget tracking
5. Integration with financial reporting
6. Advanced filtering and search
7. Budget approval workflow
8. Multi-year comparison views 