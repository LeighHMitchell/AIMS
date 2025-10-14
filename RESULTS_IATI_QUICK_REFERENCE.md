# Results IATI Integration - Quick Reference Guide

## What's Been Implemented

All missing IATI elements have been integrated into the Results tab with full functionality.

---

## How to Use the New Features

### Result Level

When editing a result, you can now:
- **Toggle Aggregation Status**: Enable if the result can be aggregated across activities
- **Add External References**: Link to external frameworks (SDGs, OECD-DAC, etc.)
- **Attach Documents**: Add supporting documentation with metadata

### Indicator Level

When editing an indicator, you have access to:

1. **Measure Type Dropdown**: Select how the indicator is measured
   - Unit (default count/number)
   - Percentage
   - Currency
   - Qualitative

2. **Ascending Toggle**: Specify if higher values mean better performance
   - ON: Higher is better (e.g., literacy rate, enrollment)
   - OFF: Lower is better (e.g., mortality rate, dropout rate)

3. **Aggregation Status**: Enable if indicator can be compared across activities

4. **Description Field**: Add detailed explanation of the indicator

5. **External References**: Link to indicator frameworks
   - Choose vocabulary (IATI, SDG, WHO, UNICEF, etc.)
   - Enter code
   - Optional: Add vocabulary URI and indicator URI

6. **Attach Documents**: Add indicator methodology documents

### Baseline Section

Enhanced baseline with:
- **Baseline Value**: The starting measurement
- **Baseline Year**: Year when baseline was established
- **Baseline Date**: Specific date of baseline measurement
- **Baseline Comment**: Explanation of baseline context

**If baseline exists**, you can also add:
- **Locations**: Geographic disaggregation (e.g., AF-KAN, KH-PNH)
- **Dimensions**: Demographic disaggregation
  - Quick templates: sex, age, disability, geographic, status
  - Custom dimensions supported
- **Documents**: Baseline assessment reports

### Period Management

Each period now supports:

**Basic Fields**:
- Period start/end dates
- Target value with comment
- Actual value with comment

**Advanced Metadata** (click arrow to expand period):

**For Targets**:
- Target-specific locations
- Target-specific dimensions (e.g., target for females aged 18-24 in urban areas)
- Target-related documents

**For Actuals**:
- Actual-specific locations
- Actual-specific dimensions (e.g., actual achievement for specific demographics)
- Actual achievement documents

**Quick Add Buttons**:
- "+ This Month" - Auto-fills current month dates with pre-populated target comment
- "+ This Quarter" - Auto-fills current quarter dates with pre-populated target comment

---

## Visual Indicators

### In Normal View (Non-Editing):

**Indicator Badges**:
- Measure type (Unit, Percentage, Currency, Qualitative)
- "Descending" badge if ascending=false
- References count (with Link icon)
- Documents count (with File icon)

**Metadata Display**:
- Indicator description shown below title
- Period comments displayed when expanded
- Dimensions shown as tag pills
- Locations shown as tag pills
- Documents listed with open link buttons

---

## Common Dimension Templates

When adding dimensions, use templates for consistency:

- **sex**: male, female, other, not specified
- **age**: 0-5, 6-12, 13-17, 18-24, 25-49, 50-64, 65+
- **disability**: yes, no, not specified
- **geographic**: urban, rural
- **status**: refugee, idp, returnee, host community

Or create custom dimensions with any name/value pairs.

---

## Reference Vocabularies

Quick reference for common vocabularies:

- **1**: IATI - Global Indicator Framework
- **2**: WB - World Bank
- **3**: UN - United Nations
- **4**: IMF - International Monetary Fund
- **5**: UNICEF
- **6**: WHO - World Health Organization
- **7**: SDG - Sustainable Development Goals
- **8**: OECD-DAC
- **9**: Sphere Standards
- **99**: Reporting Organisation (custom)

---

## IATI XML Export

All fields map directly to IATI 2.03 XML structure:

```xml
<result type="1" aggregation-status="1">
  <title><narrative>...</narrative></title>
  <description><narrative>...</narrative></description>
  <reference vocabulary="7" code="1.1" />
  <document-link url="...">...</document-link>
  
  <indicator measure="1" ascending="1" aggregation-status="1">
    <title><narrative>...</narrative></title>
    <description><narrative>...</narrative></description>
    <reference vocabulary="1" code="123" indicator-uri="..." />
    <document-link url="...">...</document-link>
    
    <baseline year="2020" iso-date="2020-01-01" value="10">
      <location ref="AF-KAN" />
      <dimension name="sex" value="female" />
      <comment><narrative>...</narrative></comment>
      <document-link url="...">...</document-link>
    </baseline>
    
    <period>
      <period-start iso-date="2021-01-01" />
      <period-end iso-date="2021-12-31" />
      <target value="20">
        <location ref="AF-KAN" />
        <dimension name="sex" value="female" />
        <comment><narrative>...</narrative></comment>
        <document-link url="...">...</document-link>
      </target>
      <actual value="22">
        <location ref="AF-KAN" />
        <dimension name="sex" value="female" />
        <comment><narrative>...</narrative></comment>
        <document-link url="...">...</document-link>
      </actual>
    </period>
  </indicator>
</result>
```

---

## Tips for Effective Use

1. **Start Simple**: Add basic indicators first, enhance with metadata as needed
2. **Use Templates**: Dimension templates ensure consistency across results
3. **Document Everything**: Attach methodology documents for transparency
4. **Disaggregate Thoughtfully**: Add locations and dimensions where meaningful
5. **Expand Periods**: Click the arrow on periods to access full metadata
6. **Link to Frameworks**: Use references to connect to global indicators (SDGs, etc.)

---

## Database Migrations Required

Before using these features, apply the migrations in Supabase SQL Editor:

1. `20250116000001_add_results_document_links.sql`
2. `20250116000002_add_results_references.sql`
3. `20250116000003_add_results_dimensions.sql`
4. `20250116000004_add_results_locations.sql`
5. `20250116000005_update_comment_fields.sql`

Copy the SQL from each file and run in order.

---

## Support

All fields include:
- Help text tooltips explaining their purpose
- Validation to prevent errors
- Success/error notifications
- Proper multilingual support

The Results framework is now fully IATI 2.03 compliant!

