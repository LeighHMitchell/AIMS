import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint should be protected with authentication in production
  // For now, we'll return a configuration that doesn't expose the API key
  
  // In production, you should:
  // 1. Verify the user is authenticated
  // 2. Use domain restrictions on the Google Maps API key
  // 3. Consider using a proxy for Google Maps requests
  
  return NextResponse.json({
    // Instead of exposing the API key, return instructions for secure setup
    message: 'Google Maps should be configured with domain restrictions',
    setup: {
      step1: 'Restrict your Google Maps API key to specific domains in Google Cloud Console',
      step2: 'Use environment variables for API keys',
      step3: 'Consider server-side rendering for maps or use a proxy endpoint',
    },
    // Only return the API key if it's properly restricted
    apiKey: process.env.NODE_ENV === 'production' 
      ? null // Don't expose in production without proper security
      : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  });
}