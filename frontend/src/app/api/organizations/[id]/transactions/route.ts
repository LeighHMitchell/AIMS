import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const organizationId = params.id;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Fetch transactions where this organization is involved
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`organization_id.eq.${organizationId},provider_org_id.eq.${organizationId},receiver_org_id.eq.${organizationId}`)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching organization transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error('Unexpected error fetching organization transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}