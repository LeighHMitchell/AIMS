# IATI Import Guide

## Overview
The AIMS system supports importing activities, organizations, and transactions from IATI (International Aid Transparency Initiative) XML files.

## Features
- **Parse IATI XML files** containing activities, organizations, and transactions
- **Automatic matching** of existing organizations and activities
- **Import additional IATI fields** including aid type, tied status, and flow type
- **Comprehensive verification** after import to ensure data integrity

## How to Use

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

## Troubleshooting

### No transactions found
- Ensure transactions are properly nested within `<iati-activity>` elements
- Check that transaction values are formatted correctly (value amount must be between `<value>` tags, not just in attributes)
- Verify the XML structure matches IATI standards
- Common issue: `<value currency="USD" value-date="2024-01-01"/>` (wrong - missing amount)
- Correct format: `<value currency="USD" value-date="2024-01-01">100000</value>`

### Import appears successful but no data saved
- Check browser console for detailed error messages
- Verify database connection settings
- Ensure proper permissions for the database user

### Organization type mapping issues
- The system maps IATI organization type codes to simplified types
- Unknown types default to null
- Check the mapping in the import code if custom types are needed

## Technical Details

The IATI import consists of three API endpoints:

1. **`/api/iati/parse`**: Parses XML and extracts data
2. **`/api/iati/import`**: Imports parsed data to the database
3. **`/api/iati/debug`**: Debug endpoint to check transaction structure

Both parse and import endpoints include extensive logging for debugging purposes.

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