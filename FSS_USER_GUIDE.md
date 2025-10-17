# Forward Spending Survey (FSS) - User Guide

## What is Forward Spending Survey?

Forward Spending Survey (FSS) is an IATI element used by donors to report multi-year spending forecasts. It provides a structured way to communicate forward-looking financial commitments and aid predictability.

FSS is particularly useful for:
- **Donor reporting** to OECD DAC on aid predictability
- **Multi-year planning** with recipient countries
- **Budget forecasting** across multiple fiscal years
- **Transparency** in forward spending commitments

## When to Use FSS

Use Forward Spending Survey when you need to:
- Report multi-year financial forecasts (2+ years)
- Indicate priority levels for funding commitments
- Specify expected phaseout years for projects
- Comply with OECD DAC Forward Spending Survey requirements

## FSS Structure

An FSS record consists of:

### Main FSS Fields
- **Extraction Date** (required): Date when forecast data was created/extracted
- **Priority Level** (optional): Confidence level in funding (1=High to 5=Uncertain)
- **Phaseout Year** (optional): Expected final year of funding
- **Notes** (optional): Additional context

### Forecast Fields (Multiple per FSS)
- **Year** (required): Forecast year (4-digit, e.g., 2025)
- **Amount** (required): Forecast amount (non-negative)
- **Currency** (required): ISO 4217 currency code (e.g., USD, GBP, EUR)
- **Value Date** (optional): Date for currency conversion
- **Notes** (optional): Forecast-specific notes

## How to Enter FSS Data Manually

### Step 1: Navigate to FSS Tab
1. Open your activity in the Activity Editor
2. Go to **Funding & Delivery** section
3. Click on **Forward Spending Survey**

### Step 2: Create FSS Record
1. Click "Create Forward Spending Survey" button
2. Enter the **Extraction Date** (required - when forecasts were prepared)
3. Optionally select a **Priority Level**:
   - **1 - High Priority**: High confidence in funding commitment
   - **2 - Medium Priority**: Moderate confidence in funding
   - **3 - Low Priority**: Lower confidence in funding
   - **4 - Very Low Priority**: Uncertain funding
   - **5 - Uncertain**: Highly uncertain or conditional
4. Optionally enter **Phaseout Year** (expected end year)
5. Add any notes

The FSS record auto-saves when you move to the next field.

### Step 3: Add Forecast Years
1. Click "Add Forecast" button
2. Enter forecast details:
   - **Year**: e.g., 2025, 2026, 2027
   - **Amount**: e.g., 250000
   - **Currency**: Select from dropdown (USD, GBP, EUR, etc.)
   - **Value Date**: Date for currency conversion (usually extraction date)
3. Click "Add Forecast"
4. Repeat for additional years

The system automatically converts amounts to USD for comparison.

## How to Import FSS via XML

### XML Format

```xml
<fss extraction-date="2025-01-15" priority="1" phaseout-year="2030">
  <forecast year="2025" value-date="2025-01-01" currency="GBP">250000</forecast>
  <forecast year="2026" value-date="2025-01-01" currency="GBP">300000</forecast>
  <forecast year="2027" value-date="2025-01-01" currency="GBP">350000</forecast>
</fss>
```

### Import Steps

1. Navigate to **Tools** → **XML Import** tab
2. Click "Upload XML File" or paste XML content
3. Select the FSS file
4. Review the import preview - FSS will show:
   - Extraction date
   - Priority level
   - Phaseout year
   - Number of forecasts
5. Check the FSS checkbox if you want to import it
6. Click "Import Selected Fields"
7. Navigate to **Funding & Delivery** → **Forward Spending Survey** to view imported data

## Priority Levels Explained

| Code | Name | Description | When to Use |
|------|------|-------------|-------------|
| 1 | High Priority | High confidence in funding commitment | Approved and allocated funding |
| 2 | Medium Priority | Moderate confidence in funding | Planned but not yet approved |
| 3 | Low Priority | Lower confidence in funding | Subject to budget availability |
| 4 | Very Low Priority | Uncertain funding | Contingent on conditions |
| 5 | Uncertain | Highly uncertain or conditional | Under discussion/negotiation |

## Currency Conversion

- The system automatically converts all forecast amounts to USD
- Conversion uses the **value date** specified in each forecast
- USD amounts are stored and displayed for easy comparison
- Original currency and amounts are preserved

## Best Practices

### 1. Consistent Extraction Dates
- Use the same extraction date for all forecasts in one FSS
- Update extraction date when revising forecasts

### 2. Realistic Priority Levels
- Be honest about funding confidence
- Update priority levels as circumstances change
- Use Priority 1 only for confirmed commitments

### 3. Multi-Year Planning
- Include at least 3 forecast years
- Extend forecasts to match project timeline
- Update annually or when significant changes occur

### 4. Phaseout Year
- Set phaseout year to indicate project end
- Update as project timeline extends
- Helps partners plan for transition

### 5. Regular Updates
- Review and update FSS quarterly or annually
- Reflect changes in funding priorities
- Maintain historical records for transparency

## Examples

### Example 1: High-Priority Multi-Year Commitment
```xml
<fss extraction-date="2025-01-15" priority="1" phaseout-year="2030">
  <forecast year="2025" value-date="2025-01-01" currency="GBP">500000</forecast>
  <forecast year="2026" value-date="2025-01-01" currency="GBP">550000</forecast>
  <forecast year="2027" value-date="2025-01-01" currency="GBP">600000</forecast>
  <forecast year="2028" value-date="2025-01-01" currency="GBP">550000</forecast>
  <forecast year="2029" value-date="2025-01-01" currency="GBP">400000</forecast>
</fss>
```

### Example 2: Short-Term Uncertain Funding
```xml
<fss extraction-date="2025-06-01" priority="5" phaseout-year="2027">
  <forecast year="2025" value-date="2025-06-01" currency="USD">100000</forecast>
  <forecast year="2026" value-date="2025-06-01" currency="USD">80000</forecast>
</fss>
```

## Troubleshooting

**Problem**: "Extraction date is required" error  
**Solution**: Ensure you've entered a valid extraction date before adding forecasts

**Problem**: "A forecast for this year already exists"  
**Solution**: Each year can only have one forecast. Edit the existing forecast or delete it first.

**Problem**: Currency conversion failed  
**Solution**: Check that the value date is valid and the currency code is correct (3-letter ISO code)

**Problem**: FSS not showing after import  
**Solution**: Verify the XML has the correct format. The extraction date is mandatory.

## Support

For additional help:
- Check the Technical Specification: `FSS_TECHNICAL_SPEC.md`
- Review test files: `test_fss_comprehensive.xml`, `test_fss_simple.xml`
- Contact your system administrator

