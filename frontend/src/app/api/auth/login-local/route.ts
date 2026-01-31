import { NextResponse } from 'next/server';

/**
 * SECURITY: This endpoint has been disabled.
 *
 * Previously contained a mock authentication bypass that accepted any
 * credentials and returned super_user privileges. This was a critical
 * vulnerability (authentication bypass) that could grant attackers
 * full administrative access.
 *
 * DO NOT re-implement mock authentication in production code.
 * Use proper Supabase authentication via /api/auth/login instead.
 */

export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function OPTIONS() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
