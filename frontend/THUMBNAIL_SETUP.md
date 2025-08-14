# PDF Thumbnail Generation Setup

This project includes automatic thumbnail generation for uploaded images and PDFs. Here's what you need to know:

## System Requirements

### macOS
```bash
# Install poppler (required for PDF thumbnail generation)
brew install poppler
```

### Ubuntu/Debian
```bash
# Install poppler utilities
sudo apt-get install poppler-utils
```

### Windows
```bash
# Using Chocolatey
choco install poppler

# Or download from: https://blog.alivate.com.au/poppler-windows/
```

## How It Works

1. **Image Thumbnails**: Uses `sharp` to resize images to 300x300px
2. **PDF Thumbnails**: Uses system `pdftoppm` to convert the first page to JPEG, then resizes with `sharp`
3. **Storage**: Thumbnails are stored in `/public/uploads/thumbnails/{activityId}/`
4. **Fallback**: If thumbnail generation fails, the upload still succeeds without a thumbnail

## File Structure

```
public/uploads/
├── documents/
│   └── {activityId}/
│       └── {uniqueId}.{extension}  # Original files
└── thumbnails/
    └── {activityId}/
        └── thumb_{uniqueId}.jpeg   # Generated thumbnails
```

## Supported Formats

- **Images**: All formats supported by `sharp` (JPEG, PNG, WebP, TIFF, etc.)
- **PDFs**: Any PDF file (converts first page only)

## Configuration

Thumbnail options can be configured in `src/lib/thumbnail-generator.ts`:

```typescript
const DEFAULT_OPTIONS = {
  width: 300,
  height: 300,
  quality: 80,
  format: 'jpeg'
};
```

## Troubleshooting

### PDF Thumbnails Not Working

1. **Check if poppler is installed**:
   ```bash
   which pdftoppm
   ```

2. **Test PDF conversion manually**:
   ```bash
   pdftoppm -f 1 -l 1 -jpeg test.pdf output
   ```

3. **Check server logs** for thumbnail generation errors

### Thumbnails Not Displaying

1. **Check file permissions** on `/public/uploads/thumbnails/`
2. **Verify thumbnail URLs** are accessible via browser
3. **Check browser console** for 404 errors

## Development

To test thumbnail generation locally:

```bash
# Start the development server
npm run dev

# Upload a PDF or image file in the Documents tab
# Check the browser network tab to see if thumbnailUrl is returned
# Verify thumbnail files are created in public/uploads/thumbnails/
```
