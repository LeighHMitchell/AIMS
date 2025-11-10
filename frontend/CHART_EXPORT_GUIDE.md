# Chart Export to CSV - Implementation Guide

## Overview
All charts in the analytics dashboard now have CSV export functionality built into the `ExpandableCard` component.

## How It Works

The `ExpandableCard` component now includes:
1. A download icon button (📥) in the top-right corner of each chart
2. An "Export CSV" button in the expanded modal view
3. Automatic CSV generation and download with proper filename

## Usage

### Option 1: Pass Data Directly (Recommended)

When using `ExpandableCard`, pass the `exportData` prop:

```tsx
<ExpandableCard
  className="bg-white border-slate-200"
  title="Budget vs. Spending Over Time"
  description="Compare budget and spending"
  exportData={chartData}  // Pass your chart data array
>
  <YourChartComponent data={chartData} />
</ExpandableCard>
```

### Option 2: Custom Export Handler

For more control, use the `onExport` callback:

```tsx
<ExpandableCard
  title="Custom Export Chart"
  onExport={() => {
    // Custom export logic
    const customData = transformData(myData)
    exportChartToCSV(customData, 'my-custom-filename')
  }}
>
  <YourChartComponent />
</ExpandableCard>
```

### Option 3: Custom Filename

Specify a custom filename:

```tsx
<ExpandableCard
  title="My Chart"
  exportData={data}
  exportFilename="budget-analysis-2024"
>
  <YourChartComponent />
</ExpandableCard>
```

## Export Functions Available

### `exportChartToCSV(data, chartTitle)`
Basic export for simple data arrays.

```typescript
import { exportChartToCSV } from '@/lib/chart-export'

exportChartToCSV(
  [
    { period: '2024-Q1', budget: 1000, actual: 900 },
    { period: '2024-Q2', budget: 1200, actual: 1100 }
  ],
  'Quarterly Budget Analysis'
)
```

### `exportChartToCSVFlattened(data, chartTitle)`
For nested objects - automatically flattens the structure.

```typescript
import { exportChartToCSVFlattened } from '@/lib/chart-export'

exportChartToCSVFlattened(
  [
    {
      name: 'Project A',
      finances: { budget: 1000, spent: 900 },
      location: { country: 'MM', city: 'Yangon' }
    }
  ],
  'Project Financial Data'
)
// Output columns: name, finances.budget, finances.spent, location.country, location.city
```

### `exportRechartsDataToCSV(data, chartTitle, customHeaders)`
For Recharts data with custom column headers.

```typescript
import { exportRechartsDataToCSV } from '@/lib/chart-export'

exportRechartsDataToCSV(
  chartData,
  'Budget Report',
  {
    period: 'Time Period',
    budget: 'Total Budget (USD)',
    actual: 'Actual Spending (USD)'
  }
)
```

## Implementation Checklist

For each chart in the analytics dashboard:

- [x] ExpandableCard component updated with export functionality
- [ ] Update chart wrapper to pass `exportData` prop
- [ ] Test export on production data
- [ ] Verify CSV formatting is correct
- [ ] Check filename generation

## Example Implementation

Here's a complete example for the analytics dashboard:

```tsx
// In analytics-dashboard/page.tsx

// Before:
<ExpandableCard
  className="bg-white border-slate-200"
  title="Budget vs. Spending Over Time"
  description="Compare budget and spending"
>
  <BudgetVsSpendingChart filters={filters} />
</ExpandableCard>

// After (with export):
const [budgetData, setBudgetData] = useState([])

<ExpandableCard
  className="bg-white border-slate-200"
  title="Budget vs. Spending Over Time"
  description="Compare budget and spending"
  exportData={budgetData}
>
  <BudgetVsSpendingChart
    filters={filters}
    onDataChange={setBudgetData}  // Chart passes data up
  />
</ExpandableCard>
```

## Chart Component Updates

Each chart component should optionally accept an `onDataChange` callback:

```tsx
interface ChartProps {
  filters: AnalyticsFilters
  onDataChange?: (data: any[]) => void  // Add this
}

export function MyChart({ filters, onDataChange }: ChartProps) {
  const [data, setData] = useState([])

  useEffect(() => {
    fetchData().then(newData => {
      setData(newData)
      onDataChange?.(newData)  // Notify parent of data change
    })
  }, [filters])

  // ... rest of component
}
```

## CSV File Format

Exported files will have:
- **Filename**: `{chart-title-kebab-case}-{YYYY-MM-DD}.csv`
- **Encoding**: UTF-8 with BOM (Excel compatible)
- **Format**: RFC 4180 compliant CSV
- **Headers**: First row contains column names
- **Quotes**: All values properly escaped and quoted

## Features

✅ Automatic filename generation from chart title
✅ Timestamp in filename
✅ UTF-8 with BOM for Excel compatibility
✅ Proper escaping of special characters
✅ Nested object flattening
✅ Custom column headers support
✅ Toast notifications for success/error
✅ Available in both card and modal views

## Troubleshooting

### Export button not showing
- Ensure `exportData` prop is passed or `onExport` callback is provided
- Check that data array is not empty

### Empty CSV file
- Verify `exportData` contains actual data
- Check browser console for errors

### Incorrect column names
- Use `exportRechartsDataToCSV` with custom headers
- Or transform data before passing to `exportData`

### Special characters not rendering
- Should work automatically with UTF-8 BOM
- If issues persist, check Excel's import settings
