import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log(`[Local Auth] Attempting login for: ${email}`);
    
    // Simple mock authentication - accept any email/password for testing
    const mockUser = {
      id: 'local-test-user',
      email: email,
      name: email.split('@')[0] || 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'super_user',
      organisation: 'Test Organization',
      department: 'Development',
      jobTitle: 'Test Administrator',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('[Local Auth] Mock login successful for:', mockUser.email);
    
    return NextResponse.json({ 
      success: true, 
      user: mockUser,
      message: 'Mock login successful (local mode)' 
    });
    
  } catch (error) {
    console.error('[Local Auth] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
