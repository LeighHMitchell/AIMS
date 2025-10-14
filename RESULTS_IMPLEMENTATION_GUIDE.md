# Results Implementation Guide

## Overview

The AIMS project now includes comprehensive support for IATI-compliant results reporting. This implementation allows users to:

1. **Manually enter results** through an intuitive UI
2. **Import results from IATI XML** files with full field support
3. **Track progress** with indicators, baselines, and periods
4. **Disaggregate data** by dimensions (sex, age, location, etc.)
5. **Link documents** at all levels of the results framework
6. **Reference external indicators** (SDGs, World Bank, UN, etc.)

## Architecture

### Database Structure

The results implementation uses a hierarchical database structure:

```
activity_results (result level)
├── result_references (vocabulary references)
├── result_document_links (supporting documents)
└── result_indicators (indicators)
    ├── indicator_references (indicator vocabularies)
    ├── indicator_document_links (indicator documents)
    ├── indicator_baselines (baseline values)
    │   ├── baseline_locations (geographic disaggregation)
    │   ├── baseline_document_links (baseline documents)
    │   └── result_dimensions (baseline dimensions)
    └── indicator_periods (reporting periods)
        ├── period_locations (target/actual locations)
        ├── period_document_links (period documents)
        └── result_dimensions (target/actual dimensions)
```

### Key Files

#### Database
- `frontend/supabase/migrations/20250115000001_enhance_results_for_iati.sql` - Complete database schema

#### Types
- `frontend/src/types/results.ts` - TypeScript interfaces and types
- `frontend/src/data/result-types.ts` - IATI result type codes
- `frontend/src/data/indicator-measure-types.ts` - IATI measure types
- `frontend/src/data/indicator-vocabularies.ts` - Reference vocabularies
- `frontend/src/data/document-formats.ts` - Document format codes

#### API
- `frontend/src/app/api/activities/[id]/results/route.ts` - Main results CRUD
- `frontend/src/app/api/activities/[id]/results/import/route.ts` - Batch import endpoint
- `frontend/src/app/api/activities/[id]/results/[resultId]/route.ts` - Single result operations

#### XML Processing
- `frontend/src/lib/xml-parser.ts` - Enhanced parser (lines 751-1061)
- `frontend/src/components/activities/XmlImportTab.tsx` - Import integration

#### UI Components
- `frontend/src/components/activities/ResultsTab.tsx` - Main results interface
- `frontend/src/hooks/use-results.ts` - Results hooks

## IATI Standard Compliance

### Result Types (IATI Code List)

| Code | Type    | Description |
|------|---------|-------------|
| 1    | Output  | Goods and services delivered |
| 2    | Outcome | Changes in institutional performance or behaviour |
| 3    | Impact  | Long-term changes in conditions or status |
| 9    | Other   | Another type of result |

### Indicator Measure Types

| Code | Measure     | Description |
|------|-------------|-------------|
| 1    | Unit        | Measured in units (e.g., number of people) |
| 2    | Percentage  | Measured as a percentage |
| 3    | Nominal     | Nominal (qualitative) measure |
| 4    | Ordinal     | Ordinal (ranked) measure |
| 5    | Qualitative | Qualitative measure |

### Aggregation Status

- `1` or `true`: Data can be aggregated across activities
- `0` or `false`: Data should not be aggregated

### Ascending Indicator

- `1` or `true`: Higher values indicate improvement
- `0` or `false`: Lower values indicate improvement (e.g., disease incidence)

## XML Import

### Supported IATI Fields

The XML parser extracts and imports **all** IATI v2.03 result fields:

#### Result Level
- ✅ Type (output/outcome/impact/other)
- ✅ Aggregation status
- ✅ Title (multilingual)
- ✅ Description (multilingual)
- ✅ References (vocabulary, code, URI)
- ✅ Document links

#### Indicator Level
- ✅ Measure type
- ✅ Ascending flag
- ✅ Aggregation status
- ✅ Title (multilingual)
- ✅ Description (multilingual)
- ✅ References (vocabulary, code, indicator URI)
- ✅ Document links

#### Baseline Level
- ✅ Year
- ✅ ISO date
- ✅ Value
- ✅ Comment (multilingual)
- ✅ Locations (multiple)
- ✅ Dimensions (disaggregation)
- ✅ Document links

#### Period Level
- ✅ Period start/end dates
- ✅ Target value, comment, locations, dimensions, documents
- ✅ Actual value, comment, locations, dimensions, documents

### Import Process

1. **Upload XML**: User selects IATI XML file in XML Import tab
2. **Parse**: System extracts all result data using enhanced parser
3. **Preview**: User sees "Results Framework" field with checkbox
4. **Select**: User checks the Results Framework field
5. **Import**: System calls `/api/activities/[id]/results/import`
6. **Feedback**: User receives detailed import summary

### Import API Response

```json
{
  "success": true,
  "summary": {
    "results_created": 3,
    "indicators_created": 5,
    "baselines_created": 5,
    "periods_created": 12,
    "references_created": 8,
    "document_links_created": 15,
    "dimensions_created": 24,
    "locations_created": 10,
    "errors": []
  }
}
```

## Testing

### Test Files

Two comprehensive test XML files are provided:

#### 1. `test_results_comprehensive.xml`
Complete example with:
- 3 results (output, outcome, impact)
- 4 indicators
- Baselines with dimensions and locations
- Multiple periods with targets and actuals
- Document links at all levels
- Various reference vocabularies

#### 2. `test_results_simple.xml`
Minimal valid example with:
- 2 results
- 2 indicators
- Basic baselines and periods
- Ideal for testing basic import functionality

### Testing Steps

1. **Test XML Parsing**:
   ```bash
   # Upload test_results_comprehensive.xml to XML Import tab
   # Verify "Results Framework" field appears with details
   ```

2. **Test Import**:
   ```bash
   # Select Results Framework checkbox
   # Click Import
   # Verify success message with counts
   ```

3. **Verify Data**:
   ```bash
   # Navigate to Results tab
   # Verify results, indicators, periods display correctly
   # Check that all fields were imported
   ```

4. **Test Database**:
   ```sql
   -- Verify results created
   SELECT * FROM activity_results WHERE activity_id = 'your-activity-id';
   
   -- Verify indicators with references
   SELECT ri.*, rr.vocabulary, rr.code 
   FROM result_indicators ri
   LEFT JOIN result_references rr ON ri.result_id = rr.result_id;
   
   -- Verify periods with dimensions
   SELECT ip.*, rd.name, rd.value
   FROM indicator_periods ip
   LEFT JOIN result_dimensions rd ON ip.id = rd.period_id;
   ```

## Migration Guide

### Running the Migration

Execute the enhanced results migration:

```sql
-- Run in Supabase SQL Editor
\i frontend/supabase/migrations/20250115000001_enhance_results_for_iati.sql
```

This migration:
- Creates 8 new tables (references, document_links, dimensions, locations)
- Modifies existing tables (comment fields now JSONB)
- Sets up Row Level Security policies
- Creates indexes for performance

### Backwards Compatibility

⚠️ **Breaking Changes**:
- `comment` fields changed from TEXT to JSONB
- `location_ref` fields moved to separate tables

If you have existing results data, you'll need to migrate:

```sql
-- Migrate baseline comments (if any exist)
UPDATE indicator_baselines 
SET comment = jsonb_build_object('en', comment::text)
WHERE comment IS NOT NULL AND jsonb_typeof(comment) != 'object';

-- Migrate period comments (if any exist)  
UPDATE indicator_periods
SET 
  target_comment = jsonb_build_object('en', target_comment::text),
  actual_comment = jsonb_build_object('en', actual_comment::text)
WHERE target_comment IS NOT NULL OR actual_comment IS NOT NULL;
```

## API Usage

### Fetch Results

```typescript
const response = await fetch(`/api/activities/${activityId}/results`);
const data = await response.json();
const results = data.results; // Array of ActivityResult objects
```

### Create Result

```typescript
const response = await fetch(`/api/activities/${activityId}/results`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'output',
    aggregation_status: true,
    title: { en: 'Improved water access' },
    description: { en: 'Communities have better access to clean water' }
  })
});
```

### Update Result

```typescript
const response = await fetch(`/api/activities/${activityId}/results/${resultId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: { en: 'Updated title' }
  })
});
```

### Import Results from XML

```typescript
const response = await fetch(`/api/activities/${activityId}/results/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    results: parsedResultsArray,
    mode: 'create' // or 'update'
  })
});

const { summary } = await response.json();
console.log(`Created ${summary.results_created} results`);
```

## Troubleshooting

### Common Issues

#### 1. Import Fails with "Table does not exist"
**Solution**: Run the migration SQL file in Supabase SQL Editor

#### 2. Comments Not Saving
**Solution**: Ensure comments are JSONB format: `{ "en": "Your comment" }`

#### 3. Periods Not Linking to Indicators
**Solution**: Verify indicator exists before creating periods

#### 4. Dimensions Not Showing
**Solution**: Check `dimension_type` is correctly set ('baseline', 'target', or 'actual')

### Debug Mode

Enable detailed logging:

```typescript
// In browser console
localStorage.setItem('DEBUG_RESULTS', 'true');
```

Check logs:
- `[Results API]` - API operations
- `[Results Hook]` - Frontend data fetching
- `[XML Import]` - Import process
- `[Results Import API]` - Batch import

## Next Steps

### Remaining Implementation Tasks

1. **UI Components** - Build reusable forms for:
   - ResultForm
   - IndicatorForm
   - PeriodForm
   - BaselineForm
   - DocumentLinkModal
   - DimensionManager

2. **Results Tab Redesign** - Implement:
   - Collapsible result cards
   - Inline editing
   - Visual progress indicators
   - Progressive disclosure UI

3. **Enhanced Hooks** - Add support for:
   - Document link management
   - Dimension CRUD operations
   - Reference management
   - Bulk operations

4. **Validation** - Add client-side validation:
   - Required fields
   - Date range validation
   - Percentage constraints
   - Value type checking

## Best Practices

### Result Design
- Start with 3-5 key results maximum
- Use Output→Outcome→Impact hierarchy
- Link to SDG indicators when possible
- Document methodology in descriptions

### Indicator Selection
- Choose SMART indicators (Specific, Measurable, Achievable, Relevant, Time-bound)
- Set realistic baselines based on data
- Use ascending=false for negative indicators (e.g., disease rates)
- Disaggregate by relevant dimensions

### Period Planning
- Align periods with reporting cycles
- Set targets before period starts
- Update actuals promptly
- Document assumptions and methods

### Data Quality
- Link supporting documents
- Include location references
- Use standard vocabularies
- Add multilingual narratives

## Support

For questions or issues:
1. Check this guide and IATI Standard documentation
2. Review test XML files for examples
3. Check browser console for detailed error messages
4. Consult the IATI community forums

## References

- [IATI Standard v2.03](https://iatistandard.org/en/iati-standard/203/)
- [IATI Results Guidance](https://iatistandard.org/en/guidance/standard-guidance/results/)
- [SDG Indicators](https://unstats.un.org/sdgs/indicators/indicators-list/)
- [World Bank Indicators](http://data.worldbank.org/indicator)

