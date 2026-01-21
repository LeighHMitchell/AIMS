import { NextResponse } from 'next/server';

// This route has been disabled for security reasons
export async function GET() {
  return NextResponse.json({ error: 'Disabled in production' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Disabled in production' }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Disabled in production' }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Disabled in production' }, { status: 404 });
}
