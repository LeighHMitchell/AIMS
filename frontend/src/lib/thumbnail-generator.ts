import sharp from 'sharp';
import { join } from 'path';
import { writeFile, mkdir, unlink, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ThumbnailResult {
  thumbnailPath: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  width: 300,
  height: 300,
  quality: 80,
  format: 'jpeg'
};

/**
 * Generate thumbnail for an image file
 */
export async function generateImageThumbnail(
  inputPath: string,
  outputDir: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Generate unique thumbnail filename
  const thumbnailFilename = `thumb_${uuidv4()}.${opts.format}`;
  const thumbnailPath = join(outputDir, thumbnailFilename);
  
  // Generate thumbnail using sharp
  const metadata = await sharp(inputPath)
    .resize(opts.width, opts.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: opts.quality })
    .toFile(thumbnailPath);
  
  // Generate public URL (assuming thumbnails are in public/uploads/thumbnails)
  const relativePath = thumbnailPath.replace(join(process.cwd(), 'public'), '');
  const thumbnailUrl = relativePath.replace(/\\/g, '/'); // Normalize path separators
  
  return {
    thumbnailPath,
    thumbnailUrl,
    width: metadata.width || opts.width,
    height: metadata.height || opts.height
  };
}

/**
 * Generate thumbnail for a PDF file (first page)
 */
export async function generatePdfThumbnail(
  inputPath: string,
  outputDir: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Create temporary directory for PDF conversion
  const tempDir = join(outputDir, 'temp_pdf_' + uuidv4());
  await mkdir(tempDir, { recursive: true });
  
  try {
    // Use system pdftoppm to convert first page of PDF to image
    const tempImagePrefix = join(tempDir, 'page');
    const command = `pdftoppm -f 1 -l 1 -jpeg -r 150 "${inputPath}" "${tempImagePrefix}"`;
    
    await execAsync(command);
    
    // Find the generated image file (pdftoppm creates files with -1 or -01 suffix)
    let generatedImagePath = `${tempImagePrefix}-1.jpg`;
    if (!existsSync(generatedImagePath)) {
      generatedImagePath = `${tempImagePrefix}-01.jpg`;
    }
    
    if (!existsSync(generatedImagePath)) {
      throw new Error('Failed to generate PDF thumbnail - no image file created');
    }
    
    // Generate thumbnail from the PDF page image
    const thumbnailFilename = `thumb_${uuidv4()}.${opts.format}`;
    const thumbnailPath = join(outputDir, thumbnailFilename);
    
    const metadata = await sharp(generatedImagePath)
      .resize(opts.width, opts.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: opts.quality })
      .toFile(thumbnailPath);
    
    // Clean up temporary files
    await unlink(generatedImagePath);
    await rmdir(tempDir);
    
    // Generate public URL
    const relativePath = thumbnailPath.replace(join(process.cwd(), 'public'), '');
    const thumbnailUrl = relativePath.replace(/\\/g, '/');
    
    return {
      thumbnailPath,
      thumbnailUrl,
      width: metadata.width || opts.width,
      height: metadata.height || opts.height
    };
    
  } catch (error) {
    // Clean up temp directory on error
    try {
      // Try to clean up any files that might have been created
      const generatedImagePath1 = join(tempDir, 'page-1.jpg');
      const generatedImagePath01 = join(tempDir, 'page-01.jpg');
      if (existsSync(generatedImagePath1)) {
        await unlink(generatedImagePath1);
      }
      if (existsSync(generatedImagePath01)) {
        await unlink(generatedImagePath01);
      }
      await rmdir(tempDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp directory:', cleanupError);
    }
    throw error;
  }
}

/**
 * Generate thumbnail for any supported file type
 */
export async function generateThumbnail(
  filePath: string,
  mimeType: string,
  outputDir: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult | null> {
  try {
    // Determine file type and generate appropriate thumbnail
    if (mimeType.startsWith('image/')) {
      return await generateImageThumbnail(filePath, outputDir, options);
    } else if (mimeType === 'application/pdf') {
      return await generatePdfThumbnail(filePath, outputDir, options);
    } else {
      // Unsupported file type for thumbnail generation
      return null;
    }
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}

/**
 * Check if a file type supports thumbnail generation
 */
export function supportsThumbnail(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}
