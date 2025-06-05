# Smart Import Tool - User Guide

## Overview
The Smart Import Tool allows bulk importing of Activities, Organizations, and Transactions from CSV or Excel files into the AIMS system. The tool features intelligent field mapping with drag-and-drop functionality and comprehensive validation.

## Getting Started

### 1. Start the Services
```bash
# From the workspace root
./start_services.sh
```

### 2. Access the Import Tool
Navigate to: `http://localhost:3000/import`

You'll see three import options:
- **Import Activities** - For project/activity data
- **Import Organizations** - For partner organization data
- **Import Transactions** - For financial transaction data

## Import Process

### Step 1: Upload File
1. Click on the type of data you want to import
2. Drag and drop your CSV/Excel file or click "Browse Files"
3. Supported formats: `.csv`, `.xls`, `.xlsx` (max 10MB)

### Step 2: Map Fields
1. The system displays your file columns on the right
2. Required system fields are shown on the left
3. Drag file columns to match system fields
4. Required fields are marked with red badges
5. Use "Auto-Match" button for automatic mapping suggestions

### Step 3: Import & Review
1. Click "Import Data" to process
2. Review the results:
   - ✅ Successfully imported records
   - ❌ Failed records with detailed errors
   - 📥 Download error log for troubleshooting

## Field Requirements

### Activities Import
**Required Fields:**
- Activity Title
- Donor Organization
- Start Date (YYYY-MM-DD)
- End Date (YYYY-MM-DD)
- Total Budget (numeric)
- Recipient Country

**Optional Fields:**
- Description
- Implementing Organization
- Activity Status
- Sector

### Organizations Import
**Required Fields:**
- Organization Name
- Organization Type (government, ngo, ingo, un, bilateral, multilateral, private, academic, other)

**Optional Fields:**
- Short Name
- IATI Organization ID
- Country
- Website
- Contact Email
- Description

### Transactions Import
**Required Fields:**
- Activity Title (must exist in system)
- Transaction Date (YYYY-MM-DD)
- Amount (numeric)
- Transaction Type (disbursement, expenditure, incoming_funds, loan_repayment, interest_payment)

**Optional Fields:**
- Currency (USD, EUR, GBP, MMK, JPY, CNY, THB)
- Provider Organization
- Receiver Organization
- Description
- Reference Number

## Sample CSV Templates

### Activities Template
```csv
Activity Title,Donor Organization,Start Date,End Date,Total Budget,Recipient Country,Description
"Water Supply Project","UNICEF","2024-01-01","2024-12-31","150000","Myanmar","Improving water access in rural areas"
"Education Support","World Bank","2024-03-01","2025-02-28","250000","Myanmar","Primary education support program"
```

### Organizations Template
```csv
Organization Name,Organization Type,IATI ID,Country,Contact Email,Website
"Myanmar Red Cross","ngo","MM-NGO-001","Myanmar","info@redcross.mm","https://redcross.mm"
"UN Development Programme","un","XM-DAC-41114","Myanmar","info@undp.org","https://undp.org"
```

### Transactions Template
```csv
Activity Title,Transaction Date,Amount,Transaction Type,Currency,Description
"Water Supply Project","2024-01-15","50000","disbursement","USD","Initial funding disbursement"
"Water Supply Project","2024-02-20","25000","expenditure","USD","Equipment purchase"
```

## Tips for Success

1. **Data Preparation**
   - Ensure dates are in YYYY-MM-DD format
   - Remove currency symbols from amounts
   - Use exact values for select fields (e.g., organization types)
   - Clean special characters from text fields

2. **Field Mapping**
   - Hover over system fields to see descriptions
   - Green highlighting indicates successful mapping
   - Red borders show unmapped required fields
   - The Auto-Match feature uses fuzzy matching

3. **Error Handling**
   - Download the error log for detailed information
   - Fix data in your source file and re-import
   - Common errors: invalid dates, missing required fields, non-numeric amounts

4. **Performance**
   - For large files (>1000 rows), import in batches
   - The system validates all rows before importing
   - Failed rows don't affect successful ones

## Troubleshooting

**"Activity not found" error for transactions:**
- Ensure the activity exists in the system first
- Use the exact activity title (case-sensitive)

**Date format errors:**
- Use YYYY-MM-DD format (e.g., 2024-03-15)
- Don't use text like "March 15, 2024"

**Invalid organization type:**
- Use one of the exact values listed above
- Check for extra spaces or typos

**File not uploading:**
- Check file size (<10MB)
- Ensure file extension is correct
- Try saving as CSV if Excel isn't working

## Security & Permissions
- You must be logged in to use the import tool
- Import access may be restricted based on user role
- All imports are logged for audit purposes

## Need Help?
Contact your system administrator or refer to the main AIMS documentation.