# IATI XML Import Guide: Budgets and Planned Disbursements

## Overview

This guide explains how to import IATI-compliant budget and planned disbursement data into the AIMS system using the IATI XML Import tool.

## Table of Contents

1. [Supported IATI Elements](#supported-iati-elements)
2. [Budget Import](#budget-import)
3. [Planned Disbursement Import](#planned-disbursement-import)
4. [Import Process](#import-process)
5. [Validation Rules](#validation-rules)
6. [Common Errors and Solutions](#common-errors-and-solutions)
7. [Best Practices](#best-practices)

---

## Supported IATI Elements

### Budget Element (`<budget>`)

**IATI Standard Version**: 2.03

**Required Attributes**:
- `type` - Budget type code (1=Original, 2=Revised)
- `status` - Budget status code (1=Indicative, 2=Committed)

**Required Child Elements**:
- `<period-start iso-date="YYYY-MM-DD" />` - Budget period start date
- `<period-end iso-date="YYYY-MM-DD" />` - Budget period end date
- `<value currency="CCC" value-date="YYYY-MM-DD">AMOUNT</value>` - Budget value with currency code

### Planned Disbursement Element (`<planned-disbursement>`)

**IATI Standard Version**: 2.03

**Optional Attributes**:
- `type` - Disbursement type code (1=Original, 2=Revised)

**Required Child Elements**:
- `<period-start iso-date="YYYY-MM-DD" />` - Disbursement period start date
- `<period-end iso-date="YYYY-MM-DD" />` - Disbursement period end date
- `<value currency="CCC" value-date="YYYY-MM-DD">AMOUNT</value>` - Disbursement value

**Optional Child Elements**:
- `<provider-org>` - Organization providing funds
  - Attributes: `ref`, `type`, `provider-activity-id`
  - Contains: `<narrative>` (organization name)
- `<receiver-org>` - Organization receiving funds
  - Attributes: `ref`, `type`, `receiver-activity-id`
  - Contains: `<narrative>` (organization name)

---

## Budget Import

### Valid Budget Example

```xml
<budget type="1" status="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
</budget>
```

**What happens when imported:**
1. ✅ Budget appears in import preview with type "Original" and status "Indicative"
2. ✅ Auto-selected if all validation rules pass
3. ✅ Currency converted to USD using value-date exchange rate
4. ✅ Saved to `activity_budgets` table
5. ✅ Visible in Budgets tab

### Budget Types

| Code | Name | Description |
|------|------|-------------|
| 1 | Original | The original budget allocated to the activity |
| 2 | Revised | A revised budget reflecting changes to the original |

### Budget Statuses

| Code | Name | Description |
|------|------|-------------|
| 1 | Indicative | A non-binding estimate of the budget |
| 2 | Committed | A formal commitment of the funds |

### Budget Validation Rules

✅ **Required Fields**:
- `type` (must be 1 or 2)
- `status` (must be 1 or 2)
- `period-start` (ISO date format)
- `period-end` (ISO date format)
- `value` (must be >= 0)
- `value-date` (ISO date format)
- `currency` (ISO 4217 currency code)

✅ **IATI Compliance Rules**:
- Period end date must be after period start date
- Period duration must not exceed 1 year (366 days)
- Value must be non-negative

⚠️ **If validation fails**: Budget will show warning message and will not be auto-selected for import

---

## Planned Disbursement Import

### Example 1: With Provider and Receiver Organizations

```xml
<planned-disbursement type="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
  <provider-org provider-activity-id="BB-BBB-123456789-1234AA" type="10" ref="BB-BBB-123456789">
    <narrative>Agency B</narrative>
  </provider-org>
  <receiver-org receiver-activity-id="AA-AAA-123456789-1234" type="23" ref="AA-AAA-123456789">
    <narrative>Agency A</narrative>
  </receiver-org>
</planned-disbursement>
```

**What happens when imported:**
1. ✅ All organization fields are preserved (name, ref, type, activity ID)
2. ✅ If organization exists in database (by `ref`), it will be linked
3. ✅ If organization doesn't exist, name and metadata are stored
4. ✅ Currency converted to USD using value-date exchange rate
5. ✅ Saved to `planned_disbursements` table
6. ✅ Visible in Planned Disbursements tab

### Example 2: Without Organizations (Also Valid)

```xml
<planned-disbursement type="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
</planned-disbursement>
```

**What happens when imported:**
- ✅ Still imports successfully
- Organization fields will be `null` in database
- Can be edited later in the UI

### Disbursement Types

| Code | Name | Description |
|------|------|-------------|
| 1 | Original | The original planned disbursement |
| 2 | Revised | A revised planned disbursement |

### Planned Disbursement Validation Rules

✅ **Required Fields**:
- `period-start` (ISO date format)
- `period-end` (ISO date format)
- `value` (must be >= 0)
- `value-date` (ISO date format)

✅ **Optional Fields**:
- `type` (if provided, must be 1 or 2)
- `provider-org` (with ref, type, provider-activity-id, narrative)
- `receiver-org` (with ref, type, receiver-activity-id, narrative)

✅ **IATI Compliance Rules**:
- Period end date must be after period start date
- Value must be non-negative
- If `type` is provided, must be 1 or 2

---

## Import Process

### Step-by-Step Guide

1. **Navigate to Activity Editor**
   - Open the activity you want to import financial data into
   - Go to the "IATI XML Import" tab

2. **Upload or Paste XML**
   - Upload an XML file, OR
   - Paste XML directly, OR
   - Provide a URL to an IATI XML file

3. **Review Import Preview**
   - System automatically validates all budgets and planned disbursements
   - Valid items are auto-selected (green checkmark ✓)
   - Invalid items show warnings (⚠️) and are not auto-selected

4. **Check Validation Messages**
   - Each item shows validation status:
     - ✅ "IATI compliant ✓" - Ready to import
     - ⚠️ "Missing period-start" - Validation error
     - ⚠️ "Period exceeds 1 year" - IATI non-compliant

5. **Select Items to Import**
   - Valid items are already selected
   - You can manually select/deselect items
   - Items with validation errors can be fixed in XML and re-imported

6. **Click "Import Selected Items"**
   - System imports selected budgets and planned disbursements
   - Shows success message with import statistics
   - View imported data in Budgets or Planned Disbursements tabs

### Import Statistics

After import, you'll see a summary like:

```
✅ Successfully imported 5 budgets
   - 3 Original budgets
   - 2 Revised budgets

✅ Successfully imported 8 planned disbursements
   - 6 Original disbursements
   - 2 Revised disbursements

⚠️ Skipped 2 items due to validation errors
```

---

## Validation Rules

### Budget Validation

| Rule | Validation | Action if Failed |
|------|-----------|-----------------|
| Type | Must be 1 or 2 | ⚠️ Show warning, don't auto-select |
| Status | Must be 1 or 2 | ⚠️ Show warning, don't auto-select |
| Period Start | Required, valid ISO date | ⚠️ Show "Missing period-start" |
| Period End | Required, valid ISO date | ⚠️ Show "Missing period-end" |
| Period Duration | End > Start, ≤ 1 year | ⚠️ Show "Period exceeds 1 year" |
| Value | Required, >= 0 | ⚠️ Show "Missing value" or "Value must be >= 0" |
| Value Date | Required, valid ISO date | ⚠️ Show "Missing value-date" |
| Currency | Valid ISO 4217 code | ⚠️ Use default currency |

### Planned Disbursement Validation

| Rule | Validation | Action if Failed |
|------|-----------|-----------------|
| Type | If provided, must be 1 or 2 | ⚠️ Show warning |
| Period Start | Required, valid ISO date | ⚠️ Show "Missing period-start" |
| Period End | Required, valid ISO date | ⚠️ Show "Missing period-end" |
| Period Duration | End > Start | ⚠️ Show "Period start must be before end" |
| Value | Required, >= 0 | ⚠️ Show "Missing value" or "Value must be >= 0" |
| Value Date | Required, valid ISO date | ⚠️ Show "Missing value-date" |
| Currency | Valid ISO 4217 code | Use default currency |

---

## Common Errors and Solutions

### Error: "Period exceeds 1 year (IATI non-compliant)"

**Cause**: Budget period is longer than 366 days

**Solution**: 
- Split the budget into multiple periods (e.g., quarterly or semi-annual)
- Each period should be ≤ 1 year

**Example Fix**:
```xml
<!-- ❌ WRONG: 18-month period -->
<budget type="1" status="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2015-06-30" />
  <value currency="EUR" value-date="2014-01-01">10000</value>
</budget>

<!-- ✅ CORRECT: Split into two annual budgets -->
<budget type="1" status="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">6667</value>
</budget>

<budget type="1" status="1">
  <period-start iso-date="2015-01-01" />
  <period-end iso-date="2015-06-30" />
  <value currency="EUR" value-date="2015-01-01">3333</value>
</budget>
```

### Error: "Missing period-start" or "Missing period-end"

**Cause**: Required `<period-start>` or `<period-end>` element is missing

**Solution**: Ensure both elements are present and have `iso-date` attribute

```xml
<!-- ✅ CORRECT -->
<budget type="1" status="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
</budget>
```

### Error: "Invalid type: 3 (must be 1 or 2)"

**Cause**: Budget or disbursement type is not a valid IATI code

**Solution**: Use only type codes 1 or 2
- `type="1"` = Original
- `type="2"` = Revised

### Error: "Value must be >= 0"

**Cause**: Negative value provided

**Solution**: Ensure value is positive or zero

```xml
<!-- ✅ CORRECT -->
<value currency="EUR" value-date="2014-01-01">3000</value>
```

### Error: "Period start must be before end"

**Cause**: Period end date is before or equal to period start date

**Solution**: Ensure end date is after start date

```xml
<!-- ✅ CORRECT -->
<period-start iso-date="2014-01-01" />
<period-end iso-date="2014-12-31" />
```

---

## Best Practices

### 1. Use IATI-Compliant Budget Periods

✅ **Recommended period lengths**:
- Quarterly: 3 months
- Semi-annual: 6 months  
- Annual: 12 months

❌ **Avoid**:
- Multi-year periods (>366 days)
- Irregular periods without clear justification

### 2. Provide Complete Organization Information

When including provider/receiver organizations in planned disbursements:

```xml
<provider-org 
  ref="GB-GOV-1"                              <!-- ✅ IATI Org ID -->
  type="10"                                   <!-- ✅ Organization Type -->
  provider-activity-id="GB-GOV-1-12345">     <!-- ✅ Activity Reference -->
  <narrative>UK Government</narrative>       <!-- ✅ Human-readable name -->
</provider-org>
```

### 3. Use Consistent Currency Codes

- Use ISO 4217 currency codes (e.g., USD, EUR, GBP)
- The system auto-converts to USD for reporting
- Currency conversion uses the `value-date` for exchange rate

### 4. Provide Accurate Value Dates

```xml
<!-- ✅ Use the date when the value was determined -->
<value currency="EUR" value-date="2014-01-01">3000</value>
```

- Used for currency conversion
- Should reflect when the budget/disbursement was set

### 5. Test Your XML Before Production Import

Use the provided test file: `test_iati_financial_comprehensive.xml`
- Contains valid and invalid examples
- Tests all validation rules
- Demonstrates best practices

---

## Troubleshooting

### Problem: Imported data doesn't appear in tabs

**Possible Causes:**
1. Items had validation errors and weren't selected
2. Database constraints prevented insert
3. Import was interrupted

**Solutions:**
1. Check import preview for validation warnings
2. Review import success message for statistics
3. Check browser console for errors
4. Re-import with corrected XML

### Problem: Currency conversion seems incorrect

**Solution:**
- Verify the `value-date` attribute is correct
- Currency conversion uses historical exchange rates from value-date
- USD values are displayed for reporting consistency

### Problem: Organization names not linking to existing organizations

**Explanation:**
- Organizations are matched by the `ref` attribute (IATI Org ID)
- If organization doesn't exist in database, name/metadata is stored
- Can be linked later via organization management

---

## Support and Additional Resources

### IATI Standard Documentation
- [IATI Budget Element](http://reference.iatistandard.org/203/activity-standard/iati-activities/iati-activity/budget/)
- [IATI Planned Disbursement Element](http://reference.iatistandard.org/203/activity-standard/iati-activities/iati-activity/planned-disbursement/)

### Test Files
- `test_iati_financial_comprehensive.xml` - Comprehensive test cases
- `test_budget_import.xml` - Budget-specific tests

### Database Schema
- Budget table: `activity_budgets`
- Planned Disbursements table: `planned_disbursements`
- Migration files available in project root

---

## Change Log

**Version 1.0** - Initial release
- Budget import with full IATI 2.03 support
- Planned disbursement import with organization support
- Comprehensive validation and error messages
- Auto-selection of valid items
- Import statistics and feedback

