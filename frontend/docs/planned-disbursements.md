# Planned Disbursements Feature

## Overview

The Planned Disbursements feature enables organizations to track and manage expected future payments for their activities, fully compliant with the IATI 2.03 standard. This feature provides a dedicated tab within the Activity Editor interface.

## Features

### 1. Core Functionality
- **IATI-compliant fields**: All fields align with IATI 2.03 standard for planned disbursements
- **Auto-save**: Changes are automatically saved as you type with debounce
- **Beautiful UI**: Modern, responsive design using Tailwind CSS and Shadcn UI components
- **Real-time validation**: Period overlap detection and required field validation
- **Charts & Analytics**: Visual timeline showing planned disbursement flow

### 2. Data Fields

Each planned disbursement includes:
- **Amount** (required): Disbursement value
- **Currency** (required): ISO 4217 currency code
- **Period Start/End** (required): Date range for the disbursement
- **Provider Organization**: Organization providing funds
- **Receiver Organization**: Organization receiving funds
- **Status**: Original or Revised
- **Value Date**: Exchange rate determination date
- **Notes**: Additional context or descriptions

### 3. User Interface Components

#### Hero Cards
Display key metrics at a glance:
- Total planned amount across all disbursements
- Time coverage showing earliest to latest periods
- Organization count (providers and receivers)

#### Timeline Chart
Interactive line chart showing:
- Individual disbursement amounts over time
- Cumulative total progression
- Responsive design with tooltips

#### Disbursement List
- Card-based layout for each disbursement
- Inline editing with auto-save
- Duplicate and delete actions
- Status badges (Original/Revised)
- Loading states and error handling

## Database Schema

The `planned_disbursements` table includes:
```sql
- id (UUID, primary key)
- activity_id (UUID, foreign key to activities)
- amount (DECIMAL)
- currency (VARCHAR)
- period_start/end (DATE)
- provider/receiver_org_id (UUID, foreign key to organizations)
- provider/receiver_org_name (VARCHAR)
- status (VARCHAR)
- value_date (DATE)
- notes (TEXT)
- created_at/updated_at (TIMESTAMP)
- created_by/updated_by (UUID, foreign key to users)
```

## Security & Permissions

- **Row Level Security (RLS)**: Implemented at database level
- **View**: Anyone can view published activities' disbursements
- **Edit/Create/Delete**: Only users with activity edit permissions
- **Audit Trail**: Tracks who created/updated each record

## API Integration

The component uses Supabase client directly for:
- Fetching planned disbursements for an activity
- Creating new disbursements
- Updating existing disbursements
- Deleting disbursements
- Fetching organizations for dropdowns

## IATI Compliance

This implementation follows IATI 2.03 standard:
- Supports original and revised status tracking
- Includes provider and receiver organization details
- Allows period-based planning
- Supports multiple currencies
- Optional value date for exchange rate determination

## Usage

1. Navigate to any activity detail page
2. Click on the "Planned Disbursements" tab
3. Click "Add Disbursement" to create a new entry
4. Fill in the required fields (amount, currency, dates)
5. Changes are auto-saved as you type
6. Use duplicate button to quickly create similar entries
7. View timeline chart for visual representation

## Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI, Recharts
- **Backend**: Supabase (PostgreSQL)
- **Date Handling**: date-fns
- **State Management**: React hooks (useState, useEffect, useCallback, useMemo)

## Future Enhancements

1. **Bulk Import**: CSV/Excel import functionality
2. **Export**: IATI XML export for planned disbursements
3. **Notifications**: Alert when disbursement dates approach
4. **Comparison**: Compare planned vs actual disbursements
5. **Templates**: Save and reuse common disbursement patterns
6. **Multi-currency**: Automatic conversion to activity default currency
7. **Approval Workflow**: Optional approval process for large disbursements 