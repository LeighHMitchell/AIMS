import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = {
  version: 1,
  fields: {
    'iati-activity/title': true,
    'iati-activity/description': true,
    'iati-activity/activity-date[@type=start-planned]': true,
    'iati-activity/activity-date[@type=end-planned]': true,
    'iati-activity/participating-org': true,
    'iati-activity/recipient-country': true,
    'iati-activity/recipient-region': true,
    'iati-activity/sector': true,
    'iati-activity/budget': true,
    'iati-activity/transaction': true,
    'iati-activity/result': true,
    'iati-activity/document-link': true,
    'iati-activity/policy-marker': true,
    'iati-activity/collaboration-type': true,
    'iati-activity/aid-type': true,
    'iati-activity/finance-type': true,
    'iati-activity/tied-status': true,
    'iati-activity/other-identifier': true,
    'iati-activity/tag': true,
  }
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: org, error } = await getSupabaseAdmin()
      .from('organizations')
      .select('iati_import_preferences')
      .eq('id', params.id)
      .single();

    if (error || !org) {
      return NextResponse.json({ error: error?.message || 'Organization not found' }, { status: 500 });
    }

    const prefs = org.iati_import_preferences || DEFAULT_PREFS;
    const response = NextResponse.json(prefs);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Basic validation: require version and fields map
    if (!body || typeof body !== 'object' || typeof body.version !== 'number' || typeof body.fields !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences payload' }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from('organizations')
      .update({ iati_import_preferences: body })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}


