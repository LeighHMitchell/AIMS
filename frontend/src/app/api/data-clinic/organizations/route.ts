import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const missingFields = searchParams.get('missing_fields') === 'true';

  try {
    // First get all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        acronym,
        iati_org_id,
        type,
        country,
        default_currency,
        website,
        total_budget,
        recipient_org_budget
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    if (!missingFields) {
      return NextResponse.json({ organizations: organizations || [] });
    }

    // Calculate data gaps
    const dataGaps = [];
    let missingIdentifier = 0;
    let invalidIdentifier = 0;
    let missingType = 0;
    let missingCurrency = 0;
    let missingBudget = 0;
    let missingCountry = 0;
    let missingAcronym = 0;

    const organizationsWithGaps = [];

    // IATI org identifier pattern: {RegistrationAgency}-{RegistrationNumber}
    const identifierPattern = /^[A-Z]{2,}-\w+$/;

    for (const org of organizations || []) {
      let hasGap = false;

      if (!org.iati_org_id) {
        missingIdentifier++;
        hasGap = true;
      } else if (!identifierPattern.test(org.iati_org_id)) {
        invalidIdentifier++;
        hasGap = true;
      }

      if (!org.type) {
        missingType++;
        hasGap = true;
      }
      if (!org.default_currency) {
        missingCurrency++;
        hasGap = true;
      }
      if (!org.total_budget && !org.recipient_org_budget) {
        missingBudget++;
        hasGap = true;
      }
      if (!org.country) {
        missingCountry++;
        hasGap = true;
      }
      if (!org.acronym) {
        missingAcronym++;
        hasGap = true;
      }

      if (hasGap) {
        organizationsWithGaps.push({
          id: org.id,
          name: org.name,
          acronym: org.acronym,
          iati_org_id: org.iati_org_id,
          type: org.type,
          country: org.country,
          default_currency: org.default_currency,
          totalBudget: org.total_budget,
          recipientOrgBudget: org.recipient_org_budget,
          website: org.website
        });
      }
    }

    // Add data gaps summary
    const totalIdentifierIssues = missingIdentifier + invalidIdentifier;
    if (totalIdentifierIssues > 0) {
      dataGaps.push({ 
        field: 'missing_identifier', 
        label: 'Missing/Invalid Identifier', 
        count: totalIdentifierIssues 
      });
    }
    if (missingType > 0) {
      dataGaps.push({ field: 'missing_type', label: 'Missing Organization Type', count: missingType });
    }
    if (missingCurrency > 0) {
      dataGaps.push({ field: 'missing_currency', label: 'Missing Default Currency', count: missingCurrency });
    }
    if (missingBudget > 0) {
      dataGaps.push({ field: 'missing_budget', label: 'Missing Budget', count: missingBudget });
    }
    if (missingCountry > 0) {
      dataGaps.push({ field: 'missing_country', label: 'Missing Country', count: missingCountry });
    }
    if (missingAcronym > 0) {
      dataGaps.push({ field: 'missing_acronym', label: 'Missing Acronym', count: missingAcronym });
    }

    return NextResponse.json({
      organizations: organizationsWithGaps,
      dataGaps
    });

  } catch (error) {
    console.error('Error fetching organizations with gaps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
} 