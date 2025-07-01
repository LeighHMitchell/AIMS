# Data Clinic Implementation Guide

## ⚠️ Important: Database Setup Required

Before using the Data Clinic feature, you MUST run the database migrations to add required columns:

```bash
# Run the main migration that adds all required fields
psql -h your-database-host -U your-user -d your-database -f frontend/sql/add_data_clinic_fields.sql

# Or if using Supabase
# Go to SQL Editor in Supabase Dashboard and run the contents of:
# frontend/sql/add_data_clinic_fields.sql
```

This migration will:
- Add `default_aid_type`, `default_finance_type`, `flow_type`, `tied_status` columns to the `activities` table
- Add `finance_type`, `aid_type`, `flow_type` columns to the `transactions` table  
- Add `identifier`, `short_name`, `default_currency`, `total_budget`, `recipient_org_budget` columns to the `organizations` table
- Create the `change_log` table for audit trails

## Overview

The Data Clinic is a feature designed to help data stewards and super users identify and fix missing or invalid IATI (International Aid Transparency Initiative) fields in aid project data. It provides a centralized interface to detect data gaps and perform bulk corrections while maintaining an audit trail of all changes.

## Features

### 1. Data Gap Detection
- **Activities**: Identifies missing aid types, finance types, flow types, sectors, implementing organizations, start dates, and activity status
- **Transactions**: Detects missing finance types, aid types, flow types, transaction types, dates, future-dated disbursements, missing organizations, and values
- **Organizations**: Finds missing/invalid identifiers, organization types, default currencies, budgets, countries, and short names

### 2. Inline Editing
- Super users can edit individual fields directly in the table view
- Changes are immediately saved and logged
- Visual feedback with edit buttons and value display

### 3. Bulk Updates
- Select multiple records and update a specific field across all selected items
- Supports updating aid types, finance types, flow types, and status fields
- Progress tracking and success notifications

### 4. Audit Trail
- All changes are logged in the `change_log` table
- Tracks: entity type, entity ID, field changed, old value, new value, user, and timestamp
- Provides accountability and rollback capability

## Components

### Frontend Components

1. **`/app/data-clinic/page.tsx`**
   - Main page with tabs for Activities, Transactions, and Organizations
   - Access control for super users and gov_partner_tier_1 users

2. **`/components/data-clinic/DataClinicActivities.tsx`**
   - Displays activities with missing IATI fields
   - Provides filtering, search, inline editing, and bulk update features

3. **`/components/data-clinic/DataClinicTransactions.tsx`**
   - Shows transactions with data gaps
   - Highlights future-dated disbursements
   - Supports inline editing and bulk updates

4. **`/components/data-clinic/DataClinicOrganizations.tsx`**
   - Lists organizations with missing or invalid data
   - Validates IATI identifier format (XX-123456)
   - Enables field-level editing

### API Endpoints

1. **`GET /api/data-clinic/activities?missing_fields=true`**
   - Returns activities with data gaps and summary statistics

2. **`PATCH /api/data-clinic/activities/[id]`**
   - Updates a single field on an activity

3. **`GET /api/data-clinic/transactions?missing_fields=true`**
   - Returns transactions with missing fields

4. **`PATCH /api/data-clinic/transactions/[id]`**
   - Updates a single field on a transaction

5. **`GET /api/data-clinic/organizations?missing_fields=true`**
   - Returns organizations with data issues

6. **`PATCH /api/data-clinic/organizations/[id]`**
   - Updates a single field on an organization

7. **`PATCH /api/data-clinic/bulk-update`**
   - Performs bulk updates across multiple entities

## Database Schema

### change_log Table
```sql
CREATE TABLE change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('activity', 'transaction', 'organization')),
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## Setup Instructions

1. **Run the database migration**:
   ```bash
   psql -h your-database-host -U your-user -d your-database -f frontend/sql/create_change_log_table.sql
   ```

2. **Ensure required columns exist**:
   - Activities: `default_aid_type`, `default_finance_type`, `flow_type`, `tied_status`
   - Transactions: `finance_type`, `aid_type`, `flow_type`
   - Organizations: `identifier`, `type`, `default_currency`, `short_name`

3. **Update navigation permissions** (already included):
   - The Data Clinic tab is visible only to `super_user` and `gov_partner_tier_1` roles

## Usage Guidelines

### For Data Stewards

1. **Regular Data Quality Checks**:
   - Visit Data Clinic weekly to identify new data gaps
   - Focus on high-priority fields like finance types and aid types
   - Use filters to target specific types of issues

2. **Bulk Corrections**:
   - Select multiple records with the same issue
   - Apply consistent values using bulk update
   - Verify changes using the refresh button

3. **Individual Corrections**:
   - Click the edit icon next to any field
   - Select or enter the correct value
   - Changes are saved automatically

### Best Practices

1. **Before Publishing**:
   - Run Data Clinic checks on all activities before IATI publication
   - Ensure 100% sector allocation for published activities
   - Verify all required IATI fields are populated

2. **Organization Identifiers**:
   - Must follow format: `{RegistrationAgency}-{RegistrationNumber}`
   - Examples: `GB-CHC-123456`, `US-EIN-12-3456789`
   - Invalid formats are highlighted with warning icons

3. **Future-dated Disbursements**:
   - Automatically flagged with calendar icons
   - Review and correct transaction dates before publication

## Validation Rules

### IATI Compliance
- Aid Type codes: A01-A02, B01-B04, C01, D01-D02, E01-E02, F01, G01, H01-H02
- Finance Type codes: 110, 210, 310-311, 410-421, 451-453, 510-632, 700, 810, 910, 1100
- Flow Type codes: 10, 20-22, 30, 35-37, 40, 50
- Organization Types: 10-11, 15, 21-23, 30, 40, 60, 70, 80, 90

### Data Quality Checks
- Transaction dates cannot be in the future for disbursements
- Organization identifiers must contain a hyphen
- All published activities must have sectors totaling 100%
- Activities should have at least one implementing organization

## Security Considerations

1. **Access Control**:
   - Only super users can perform edits
   - Gov partners (tier 1) can view but not edit
   - All changes are attributed to the user

2. **Audit Trail**:
   - Every change is logged with timestamp
   - Old values are preserved for rollback
   - User accountability is maintained

3. **Data Integrity**:
   - Foreign key constraints ensure valid references
   - Check constraints validate enum values
   - Null values are handled appropriately

## Troubleshooting

### Common Issues

1. **"Failed to update" errors**:
   - Check user permissions
   - Verify database connectivity
   - Ensure valid field values

2. **Missing data not showing**:
   - Refresh the page
   - Check filter settings
   - Verify API endpoint responses

3. **Bulk updates not working**:
   - Ensure records are selected
   - Verify field and value are provided
   - Check for database constraints

4. **"No activities found with data gaps"**:
   - Run the database migration first: `frontend/sql/add_data_clinic_fields.sql`
   - Check browser console for API errors
   - Verify that activities exist in the database
   - Try clicking "All Activities" filter to see all records

## Future Enhancements

1. **Export functionality**: Download data gaps report as CSV
2. **Auto-suggestions**: ML-based value recommendations
3. **Scheduled reports**: Email summaries of data quality
4. **API integration**: Direct IATI validation service connection
5. **Rollback capability**: Undo recent changes from audit log
6. **Custom validation rules**: Organization-specific requirements