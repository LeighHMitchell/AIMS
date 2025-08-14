import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[TEST] This is a test log message');
  console.log('[TEST] Request URL:', request.url);
  console.log('[TEST] Current time:', new Date().toISOString());
  
  return NextResponse.json({ 
    message: 'Test logging endpoint',
    timestamp: new Date().toISOString()
  });
}
