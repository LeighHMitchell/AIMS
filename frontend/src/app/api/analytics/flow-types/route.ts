import { NextResponse } from 'next/server';
import { FLOW_TYPES } from '@/utils/transactionMigrationHelper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Convert FLOW_TYPES object to array format expected by frontend
    const flowTypes = Object.entries(FLOW_TYPES).map(([code, name]) => ({
      code,
      name
    }));

    return NextResponse.json(flowTypes);

  } catch (error) {
    console.error('Error in flow-types API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}