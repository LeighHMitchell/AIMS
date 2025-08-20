import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const type: string = data.get('type') as string || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${type}-${uuidv4()}.${fileExtension}`;
    
    // Create uploads directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Ensure uploads directory exists
    const { mkdir } = await import('fs/promises');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    await writeFile(filePath, buffer);
    
    // Return the URL path
    const url = `/uploads/${fileName}`;
    
    console.log('[Upload API] File uploaded successfully:', {
      originalName: file.name,
      fileName,
      url,
      size: file.size
    });
    
    return NextResponse.json({ 
      success: true,
      url,
      fileName,
      originalName: file.name,
      size: file.size
    });
    
  } catch (error) {
    console.error('[Upload API] Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
