/**
 * PDF Thumbnail Generator
 *
 * Uses pdfjs-dist with canvas for server-side PDF thumbnail generation.
 * This is pure JavaScript and works on Vercel and other serverless platforms.
 */

import sharp from 'sharp';
import { join } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface PdfThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  scale?: number;
}

export interface PdfThumbnailResult {
  thumbnailPath: string;
  width: number;
  height: number;
  buffer: Buffer;
}

const DEFAULT_OPTIONS: Required<PdfThumbnailOptions> = {
  width: 300,
  height: 400,
  quality: 85,
  scale: 1.5, // Render at 1.5x scale for better quality
};

/**
 * Generate a thumbnail from the first page of a PDF using pdfjs-dist
 */
export async function generatePdfThumbnailFromBuffer(
  pdfBuffer: Buffer,
  outputDir: string,
  options: PdfThumbnailOptions = {}
): Promise<PdfThumbnailResult | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Dynamically import pdfjs-dist and canvas
    const pdfjs = await import('pdfjs-dist');
    const { createCanvas } = await import('canvas');

    // Disable the worker for server-side use (runs in main thread)
    // This is required for Node.js environments
    pdfjs.GlobalWorkerOptions.workerSrc = '';

    // Load the PDF from buffer
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
      console.error('[PDF Thumbnail] PDF has no pages');
      return null;
    }

    // Get the first page
    const page = await pdf.getPage(1);

    // Calculate viewport dimensions
    const viewport = page.getViewport({ scale: opts.scale });

    // Create a canvas with the viewport dimensions
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render the page to the canvas
    await page.render({
      canvasContext: context as any,
      viewport: viewport,
    }).promise;

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Generate unique thumbnail filename
    const thumbnailFilename = `thumb_${uuidv4()}.jpg`;
    const thumbnailPath = join(outputDir, thumbnailFilename);

    // Use sharp to resize and convert to JPEG with good quality
    const processedImage = await sharp(pngBuffer)
      .resize(opts.width, opts.height, {
        fit: 'inside',
        withoutEnlargement: false,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background for transparency
      .jpeg({ quality: opts.quality })
      .toBuffer();

    // Write to file
    await writeFile(thumbnailPath, processedImage);

    // Get dimensions of the final image
    const metadata = await sharp(processedImage).metadata();

    // Clean up PDF resources
    await pdf.destroy();

    return {
      thumbnailPath,
      width: metadata.width || opts.width,
      height: metadata.height || opts.height,
      buffer: processedImage,
    };

  } catch (error) {
    console.error('[PDF Thumbnail] Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Generate a thumbnail from a PDF file path
 */
export async function generatePdfThumbnailFromFile(
  filePath: string,
  outputDir: string,
  options: PdfThumbnailOptions = {}
): Promise<PdfThumbnailResult | null> {
  try {
    const { readFile } = await import('fs/promises');
    const pdfBuffer = await readFile(filePath);
    return generatePdfThumbnailFromBuffer(pdfBuffer, outputDir, options);
  } catch (error) {
    console.error('[PDF Thumbnail] Failed to read PDF file:', error);
    return null;
  }
}

/**
 * Generate thumbnail directly from buffer and return as buffer (no file I/O)
 * Useful for streaming uploads where we don't want to write temp files
 */
export async function generatePdfThumbnailBuffer(
  pdfBuffer: Buffer,
  options: PdfThumbnailOptions = {}
): Promise<Buffer | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Dynamically import pdfjs-dist and canvas
    const pdfjs = await import('pdfjs-dist');
    const { createCanvas } = await import('canvas');

    // Disable the worker for server-side use
    pdfjs.GlobalWorkerOptions.workerSrc = '';

    // Load the PDF from buffer
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
      console.error('[PDF Thumbnail] PDF has no pages');
      return null;
    }

    // Get the first page
    const page = await pdf.getPage(1);

    // Calculate viewport dimensions
    const viewport = page.getViewport({ scale: opts.scale });

    // Create a canvas with the viewport dimensions
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render the page to the canvas
    await page.render({
      canvasContext: context as any,
      viewport: viewport,
    }).promise;

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');

    // Use sharp to resize and convert to JPEG
    const processedImage = await sharp(pngBuffer)
      .resize(opts.width, opts.height, {
        fit: 'inside',
        withoutEnlargement: false,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: opts.quality })
      .toBuffer();

    // Clean up PDF resources
    await pdf.destroy();

    return processedImage;

  } catch (error) {
    console.error('[PDF Thumbnail] Failed to generate thumbnail buffer:', error);
    return null;
  }
}
