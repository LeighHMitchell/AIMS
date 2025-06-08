# Bulk Import Feature Summary

## Overview
Added a bulk import feature to the AIMS application that allows users to import multiple activities from CSV files. The feature includes a user-friendly interface with drag-and-drop functionality, template downloads, validation, and progress tracking.

## Components Added

### 1. BulkImportDialog Component (`/components/BulkImportDialog.tsx`)
- Reusable dialog component that handles CSV file uploads
- Features:
  - Drag-and-drop file upload
  - CSV template download
  - Real-time validation
  - Progress tracking
  - Error reporting
  - Import summary
- Supports importing activities, partners, and transactions (activities implemented first)

### 2. Progress Component (`/components/ui/progress.tsx`)
- Simple progress bar component based on Radix UI
- Used to show import progress

### 3. Activities Page Updates (`/app/activities/page.tsx`)
- Added "Import Activities" button next to "Export All Activities"
- Added state management for bulk import dialog
- Added `handleBulkImport` function to process CSV data
- Integrated BulkImportDialog component

### 4. Bulk Import API Route (`/api/activities/bulk-import/route.ts`)
- Handles bulk activity imports
- Features:
  - Validates each activity
  - Creates activities with proper IDs
  - Handles sectors and tags
  - Logs activity creation events
  - Returns detailed results with success/failure counts

## CSV Template Format

The activities import template includes these fields:
- Partner ID
- IATI ID
- Title (required)
- Description
- Activity Status (planning, implementation, completed, cancelled)
- Start Date (YYYY-MM-DD)
- End Date (YYYY-MM-DD)
- Objectives
- Target Groups
- Collaboration Type
- Sectors (semicolon separated)
- Tags (semicolon separated)

## How to Use

1. **Access the Feature**
   - Navigate to the Activities page
   - Click the "Import Activities" button

2. **Download Template**
   - Click "Download Template" to get a CSV file with the correct headers
   - Fill in your activity data following the format

3. **Upload CSV**
   - Drag and drop your CSV file or click to browse
   - The system will validate the file format

4. **Review and Import**
   - Review any validation errors
   - Click "Import" to process the file
   - Monitor the progress bar
   - Review the import summary

## Error Handling

The system provides detailed error messages for:
- Missing required fields (Title)
- Invalid date formats
- File parsing errors
- Database insertion errors

Each error includes the row number and specific issue for easy troubleshooting.

## Security Considerations

- All imports are logged with user information
- Activities are created with the current user's organization
- Proper validation prevents SQL injection
- File size limits prevent DoS attacks

## Future Enhancements

1. **Partners Import**
   - Already supported in BulkImportDialog
   - Need to add API route and page integration

2. **Transactions Import**
   - Already supported in BulkImportDialog
   - Need to add API route and page integration

3. **Advanced Features**
   - Duplicate detection
   - Update existing records option
   - Batch size configuration
   - Background processing for large files
   - Email notifications on completion

## Technical Notes

- Uses react-dropzone for file handling
- CSV parsing is done client-side for better performance
- Imports are processed sequentially to maintain data integrity
- Each import operation is wrapped in try-catch for error isolation 