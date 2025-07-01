# Sector Allocation Integration Guide

## Overview
The sector allocation feature has been integrated into the AIMS project to provide comprehensive management of activity sectors using OECD DAC codes.

## Integration Points

### 1. Activity Creation/Edit Form
- **Location**: `/activities/new`
- **Component**: `SectorsSection`
- Basic sector allocation during activity creation
- Now uses the full DAC codes from our centralized data source
- Includes category information for better organization

### 2. Activity Detail Page
- **Location**: `/activities/[id]`
- **Features**:
  - "Sectors" tab shows current allocations
  - "Manage Sectors" button links to advanced management page
  - Visual display of sector allocations with percentages
  - Primary/Secondary sector distinction

### 3. Advanced Sector Management
- **Location**: `/activities/[id]/sectors`
- **Features**:
  - Full sector allocation interface
  - Visualizations (donut chart, stacked bar)
  - Batch operations
  - DAC code search and filtering
  - Validation of total percentages

## Data Flow

1. **Creation**: Sectors are added via `SectorsSection` component
2. **Storage**: Saved to `activity_sectors` table with:
   - `sector_code`: DAC 5-digit code
   - `sector_name`: Sector name
   - `percentage`: Allocation percentage
   - `type`: primary/secondary
   - `category`: DAC category name

3. **Display**: Shown in activity detail view with proper formatting
4. **Management**: Advanced editing via dedicated sectors page

## API Integration

### Endpoints
- `POST /api/activities` - Saves sectors with activity
- `GET /api/activities/[id]/sectors` - Retrieves sector allocations
- `POST /api/activities/[id]/sectors` - Updates sector allocations

### Data Format
```typescript
{
  id: string,
  sector_code: string,
  sector_name: string,
  percentage: number,
  type: 'primary' | 'secondary',
  category?: string
}
```

## User Permissions
- Activity creators and editors can manage sectors
- View permissions follow activity view permissions
- Government users have oversight capabilities

## Usage Instructions

1. **Adding Sectors During Creation**:
   - Navigate to "Create Activity"
   - Go to "Sectors" section
   - Select DAC codes and allocate percentages
   - Ensure total equals 100%

2. **Managing Existing Sectors**:
   - Open activity detail page
   - Click "Sectors" tab
   - Click "Manage Sectors" button
   - Use advanced interface for comprehensive management

3. **Viewing Sector Allocations**:
   - Sectors appear in "About" tab summary
   - Detailed view in "Sectors" tab
   - Visualizations available in management interface 