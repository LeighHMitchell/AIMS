import { NextResponse } from 'next/server';
import { AID_TYPES } from '@/utils/transactionMigrationHelper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Convert AID_TYPES object to array format expected by frontend
    const aidTypes = Object.entries(AID_TYPES).map(([code, name]) => ({
      code,
      name
    }));

    return NextResponse.json(aidTypes);

  } catch (error) {
    console.error('Error in aid-types API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}