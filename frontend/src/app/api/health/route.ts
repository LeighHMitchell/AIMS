import { NextResponse } from 'next/server';

/**
 * SECURITY: Minimal health check endpoint for monitoring services.
 *
 * This endpoint is intentionally public for uptime monitors, load balancers,
 * and deployment readiness probes.
 *
 * IMPORTANT: This endpoint must NEVER expose:
 * - Database table names or structure
 * - Row counts or data statistics
 * - Environment variable status
 * - Error messages or stack traces
 * - Any internal implementation details
 *
 * The only valid responses are:
 * - 200 { "status": "ok" } - Service is healthy
 * - 503 { "status": "error" } - Service is unhealthy
 */
export async function GET() {
  try {
    // SECURITY: Perform minimal connectivity check WITHOUT using service role key.
    // We only verify that the application can respond - no database enumeration.
    //
    // If deeper health checks are needed for internal monitoring, create a
    // separate authenticated endpoint (e.g., /api/admin/diagnostics) that
    // requires super_user authentication.

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check if essential configuration exists (do NOT reveal which are missing)
    if (!supabaseUrl || !supabaseAnonKey) {
      // Return generic error - do not specify what is misconfigured
      return NextResponse.json(
        { status: 'error' },
        { status: 503 }
      );
    }

    // Application is configured and responding
    return NextResponse.json(
      { status: 'ok' },
      { status: 200 }
    );
  } catch {
    // SECURITY: Catch all errors and return generic response.
    // Never expose error details to unauthenticated callers.
    return NextResponse.json(
      { status: 'error' },
      { status: 503 }
    );
  }
}
