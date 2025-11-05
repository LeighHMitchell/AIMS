# IATI Import Guide

## Overview
The AIMS system supports importing activities, organizations, and transactions from IATI (International Aid Transparency Initiative) XML files.

## Features
- **Parse IATI XML files** containing activities, organizations, and transactions
- **Multi-activity import** with preview and selective import capabilities
- **Automatic matching** of existing organizations and activities
- **Import additional IATI fields** including aid type, tied status, and flow type
- **Comprehensive verification** after import to ensure data integrity
- **Three import modes**: Update Current Activity, Create New Activity, or Bulk Create Activities

## How to Use

### Single Activity Import (Activity Editor)

1. **Navigate to Activity Editor**
   - Open any activity in the Activity Editor
   - Click the "XML Import" tab

2. **Choose Import Method**
   - **IATI Search**: Search IATI registry for activities
   - **Upload File**: Upload an IATI XML file from your computer
   - **From URL**: Import from a public URL containing IATI XML
   - **Paste Snippet**: Paste XML content directly

3. **Multi-Activity Detection**
   - If the file contains multiple activities, you'll see a preview modal
   - The system automatically detects and shows all activities in the file

4. **Select Activities**
   - Review the activity list with key metadata:
     - IATI ID
     - Title and description
     - Status and dates
     - Budget and transaction counts
   - Filter by: All, New Only, or Existing Only
   - Search across titles, IDs, and descriptions
   - Select activities using checkboxes

5. **Choose Import Mode**
   - **Update Current Activity**: Import selected activity into current activity (single selection only)
   - **Create New Activity**: Create one new activity (single selection only)
   - **Bulk Create Activities**: Create multiple new activities at once

6. **Import**
   - Click "Import Selected" to proceed
   - For Update Current mode: Select fields to import, then confirm
   - For Create New/Bulk Create: Activities are created directly

### Standalone IATI Import Page

1. **Navigate to IATI Import**
   - Go to `/iati` in your browser
   - You'll see the IATI Data Import page

2. **Upload IATI File**
   - Click the upload area or drag and drop an IATI XML file
   - Supported formats: `.xml` files containing IATI activities

3. **Parse the File**
   - Click "Parse File" to extract data from the XML
   - Review the parsed results showing:
     - Number of activities found
     - Number of organizations found
     - Number of transactions found
     - Any existing matches in the database

4. **Import Data**
   - Click "Import Data" to save to the database
   - The system will:
     - Create new organizations or update existing ones
     - Create new activities or update existing ones
     - Import all transactions with their IATI-specific fields

5. **Verify Results**
   - After import, you'll see:
     - Number of records created/updated
     - Total counts in the database
     - Sample of recently imported transactions
     - Any errors or warnings

## Database Schema Mapping

### Organizations
- `name`: Organization name from IATI
- `type`: Mapped from IATI organization type codes (e.g., '10' → 'government', '40' → 'multilateral')
- `iati_org_id`: IATI organization identifier
- `country`: Country code (defaults to 'MM' for Myanmar if not specified)
- `acronym`: Organization acronym if available

### Activities
- `title`: Activity title
- `description`: Activity description
- `iati_id`: IATI activity identifier
- `activity_status`: Mapped from IATI status codes
- `planned_start_date`: Activity start date
- `planned_end_date`: Activity end date
- `partner_id`: ID of implementing or funding organization

### Transactions
- `transaction_type`: Mapped from IATI transaction types (e.g., 'Disbursement' → 'D', 'Commitment' → 'C')
- `value`: Transaction amount
- `currency`: Currency code (defaults to 'USD')
- `transaction_date`: Date of transaction
- `provider_org`: Provider organization name (text)
- `receiver_org`: Receiver organization name (text)
- `status`: Set to 'actual' for all IATI transactions
- `aid_type`: IATI aid type code (e.g., 'C01' for project-type interventions)
- `tied_status`: IATI tied status code ('3' = Untied, '4' = Tied, '5' = Partially tied)
- `flow_type`: IATI flow type code (e.g., '10' = ODA, '20' = OOF)

## Multi-Activity Import Features

### Activity Preview Cards
Each activity in the preview displays:
- **Status Badge**: "Already Exists" or "New" indicator
- **IATI Identifier**: Unique activity ID
- **Title and Description**: Activity details
- **Organization**: Reporting organization name
- **Dates**: Planned start and end dates
- **Budget**: Total budget amount
- **Transaction Count**: Number of transactions

### Filtering and Search
- **Filter by Status**: Show all, new only, or existing only
- **Search**: Filter activities by title, IATI ID, description, or organization
- **Statistics Bar**: Shows counts of total, new, existing, and selected activities

### Bulk Actions
- **Select All**: Select all visible activities
- **Select New Only**: Quickly select only new activities
- **Deselect All**: Clear all selections

### Import Modes Explained

#### 1. Update Current Activity
- **Use Case**: Replace current activity data with selected IATI activity
- **Requirement**: Must select exactly 1 activity
- **Behavior**: Shows field selection interface, allows cherry-picking fields
- **Best For**: Updating an existing activity with fresh IATI data

#### 2. Create New Activity
- **Use Case**: Create a single new activity from IATI data
- **Requirement**: Must select exactly 1 activity
- **Behavior**: Creates new activity with full data import
- **Best For**: Adding one specific activity from a multi-activity file

#### 3. Bulk Create Activities
- **Use Case**: Import multiple activities at once
- **Requirement**: Select 1 or more activities
- **Behavior**: Creates all selected activities in one operation
- **Best For**: Importing entire datasets or programs with multiple activities
- **Related Data**: Automatically imports sectors, countries, and transactions

## Troubleshooting

### Multi-Activity Import Issues

#### Preview modal doesn't show
- **Check**: File must contain 2 or more activities
- **Solution**: Single-activity files bypass the preview and go directly to field selection

#### "Already Exists" badge on all activities
- **Cause**: Activities with same IATI IDs already in database
- **Solution**: Use "Update Current" mode to refresh existing activities, or modify IATI IDs

#### Bulk create fails for some activities
- **Cause**: Partial success - some activities may have validation errors
- **Check**: Review error messages in response
- **Solution**: Import successful activities are still created; fix and re-import failed ones

#### Import mode buttons are disabled
- **Cause**: Selection requirements not met
- **Update Current**: Requires exactly 1 selected activity
- **Create New**: Requires exactly 1 selected activity
- **Bulk Create**: Requires at least 1 selected activity

### General Import Issues

#### No transactions found
- Ensure transactions are properly nested within `<iati-activity>` elements
- Check that transaction values are formatted correctly (value amount must be between `<value>` tags, not just in attributes)
- Verify the XML structure matches IATI standards
- Common issue: `<value currency="USD" value-date="2024-01-01"/>` (wrong - missing amount)
- Correct format: `<value currency="USD" value-date="2024-01-01">100000</value>`

#### Import appears successful but no data saved
- Check browser console for detailed error messages
- Verify database connection settings
- Ensure proper permissions for the database user

#### Organization type mapping issues
- The system maps IATI organization type codes to simplified types
- Unknown types default to null
- Check the mapping in the import code if custom types are needed

## Technical Details

### API Endpoints

The IATI import system includes the following API endpoints:

1. **`/api/iati/parse`**: Parses XML and extracts data
2. **`/api/iati/import`**: Imports parsed data to the database
3. **`/api/iati/debug`**: Debug endpoint to check transaction structure
4. **`/api/activities/bulk-import-iati`**: Bulk create multiple activities from IATI XML

All endpoints include extensive logging for debugging purposes.

### Multi-Activity Parser Methods

The `IATIXMLParser` class includes these methods for multi-activity support:

- **`countActivities()`**: Returns the number of activities in the XML
- **`parseAllActivitiesMetadata()`**: Extracts lightweight metadata for all activities (for preview)
- **`parseActivityByIndex(index)`**: Parses full activity data for a specific activity by index

### Conflict Detection

The system automatically checks for existing activities by IATI ID:

- **Database Lookup**: `checkExistingActivities(iatiIds: string[])`
- **Returns**: Map of existing activities with ID, title, and last updated date
- **Used For**: Displaying "Already Exists" badges and preventing duplicates

### Using the Debug Endpoint

If transactions aren't importing, you can use the debug endpoint to check the XML structure:

```javascript
const formData = new FormData();
formData.append('file', xmlFile);

const response = await fetch('/api/iati/debug', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.debug);
console.log(result.recommendation);
```

This will show you:
- How many activities have transactions
- Sample transaction structures
- Common issues like missing value text content

## Example Multi-Activity XML

Here's a sample IATI XML file containing multiple activities:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>GB-GOV-1-12345</iati-identifier>
    <title>
      <narrative>Rural Water Supply Project</narrative>
    </title>
    <description>
      <narrative>Improving access to clean water in rural communities</narrative>
    </description>
    <activity-status code="2"/>
    <activity-date iso-date="2023-01-01" type="1"/>
    <activity-date iso-date="2025-12-31" type="3"/>
    <reporting-org ref="GB-GOV-1" type="10">
      <narrative>UK Department for Development</narrative>
    </reporting-org>
    <budget type="1" status="1">
      <period-start iso-date="2023-01-01"/>
      <period-end iso-date="2025-12-31"/>
      <value currency="USD" value-date="2023-01-01">1250000</value>
    </budget>
    <transaction>
      <transaction-type code="3"/>
      <transaction-date iso-date="2023-06-15"/>
      <value currency="USD" value-date="2023-06-15">250000</value>
      <description>
        <narrative>Initial disbursement</narrative>
      </description>
    </transaction>
  </iati-activity>
  
  <iati-activity>
    <iati-identifier>GB-GOV-1-67890</iati-identifier>
    <title>
      <narrative>Healthcare Infrastructure Development</narrative>
    </title>
    <description>
      <narrative>Building and equipping rural health clinics</narrative>
    </description>
    <activity-status code="2"/>
    <activity-date iso-date="2023-03-01" type="1"/>
    <activity-date iso-date="2026-02-28" type="3"/>
    <reporting-org ref="GB-GOV-1" type="10">
      <narrative>UK Department for Development</narrative>
    </reporting-org>
    <budget type="1" status="1">
      <period-start iso-date="2023-03-01"/>
      <period-end iso-date="2026-02-28"/>
      <value currency="USD" value-date="2023-03-01">2500000</value>
    </budget>
  </iati-activity>
</iati-activities>
```

When importing this file:
1. The preview will show 2 activities
2. You can select one or both for import
3. Each activity will import with its complete data (title, dates, budget, transactions, etc.)
4. The system will check if either IATI ID already exists in your database