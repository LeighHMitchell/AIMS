import { generatePdfThumbnail, supportsThumbnail } from './src/lib/thumbnail-generator';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPdfThumbnail() {
  try {
    console.log('Testing PDF thumbnail generation...');
    
    // Test if PDF mime type is supported
    console.log('PDF supported:', supportsThumbnail('application/pdf'));
    console.log('Image supported:', supportsThumbnail('image/jpeg'));
    
    const testPdfPath = join(__dirname, 'test.pdf');
    const outputDir = join(__dirname, 'test-thumbnails');
    
    // Create output directory
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('PDF thumbnail generation function is available');
    console.log('To test with a real PDF, place a PDF file at:', testPdfPath);
    
    if (existsSync(testPdfPath)) {
      console.log('Found test PDF, generating thumbnail...');
      const result = await generatePdfThumbnail(testPdfPath, outputDir);
      console.log('Thumbnail generated successfully:', result);
    } else {
      console.log('No test PDF found. Create a test.pdf file in the frontend directory to test.');
      console.log('You can download a sample PDF from: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    }
    
  } catch (error) {
    console.error('Error testing PDF thumbnail:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  }
}

testPdfThumbnail();
