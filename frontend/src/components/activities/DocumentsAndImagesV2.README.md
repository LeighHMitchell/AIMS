# Documents & Images V2 - Drag & Drop File Upload

## New Features

The updated Documents & Images tab now supports:

### 1. **Drag & Drop File Upload**
- Drag files directly onto the component to upload
- Visual feedback with drop zone overlay
- Supports multiple file uploads simultaneously

### 2. **File Upload Button**
- Click "Upload Files" to select files from your computer
- Accepts images, PDFs, Word docs, Excel files, and CSVs

### 3. **Upload Progress**
- Real-time progress bars for each uploading file
- Status indicators: uploading → processing → complete
- Error handling with clear messages

### 4. **Modal Interface**
- Replaced drawer with a modal dialog for better UX
- Clean, focused interface for adding document metadata

### 5. **Backend File Storage**
- Files are uploaded to `/public/uploads/documents/{activityId}/`
- Unique filenames prevent conflicts
- 10MB file size limit

## How to Use

### Upload Files
1. **Drag & Drop**: Simply drag files from your computer onto the Documents tab
2. **Click Upload**: Click the "Upload Files" button and select files
3. Files are automatically uploaded and added to your documents list

### Add URLs
1. Click "Add URL" to manually add external document links
2. Fill in the IATI-compliant metadata in the modal
3. Save to add the document

### Edit Documents
1. Click the "Edit" button on any document card
2. Update metadata in the modal
3. Save changes

## API Endpoint

`POST /api/documents/upload`

Accepts:
- `file`: The file to upload (multipart/form-data)
- `activityId`: Optional activity ID for organizing uploads

Returns:
```json
{
  "url": "/uploads/documents/activity-id/filename.pdf",
  "filename": "original-filename.pdf",
  "size": 1234567,
  "mimeType": "application/pdf",
  "uploadedAt": "2024-01-01T00:00:00Z"
}
```

## File Storage

Files are stored in:
```
public/
  uploads/
    documents/
      {activityId}/
        {uniqueId}.{extension}
```

The `public/uploads/` directory is gitignored to prevent uploaded files from being committed.

## Migration from V1

The main differences from the original version:
1. **Drawer → Modal**: DocumentForm now uses Dialog instead of Sheet
2. **URL-only → Files + URLs**: Supports actual file uploads
3. **No backend → File storage**: Files are saved to the server
4. **Basic UI → Enhanced UX**: Drag & drop, progress bars, better feedback

## Technical Details

- Uses `FormData` API for file uploads
- UUID v4 for unique filenames
- Progress tracking with state management
- MIME type detection from file extension
- Automatic image detection for preview
- Graceful error handling with user feedback
