import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Make an internal request to create a test activity
  try {
    const testActivity = {
      title: "Test Activity from API",
      description: "This is a test activity created directly from the API",
      activityStatus: "planning",
      publicationStatus: "draft",
    };

    // Call the activities API internally
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3001';
      
    const response = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testActivity),
    });

    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: data,
      message: response.ok ? 'Activity created successfully' : 'Failed to create activity',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Error creating test activity',
    });
  }
} 