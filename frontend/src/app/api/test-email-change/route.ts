import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[TEST] Testing email change functionality');
  
  try {
    // Test the email change API
    const testData = {
      userId: 'local-test-user',
      newEmail: 'updated-test@example.com',
      currentUserRole: 'super_user'
    };

    // Make internal API call to test the email change
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/users/change-email-simple`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Email change test passed!',
        testData,
        result,
        status: response.status
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Email change test failed',
        testData,
        error: result,
        status: response.status
      });
    }

  } catch (error) {
    console.error('[TEST] Error testing email change:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed with exception',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Reset test data
  console.log('[TEST] Resetting test data');
  
  try {
    // This will trigger re-initialization of the local database
    const { initializeLocalDb } = await import('@/lib/db/local-db');
    initializeLocalDb();
    
    return NextResponse.json({
      success: true,
      message: 'Test data reset successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
