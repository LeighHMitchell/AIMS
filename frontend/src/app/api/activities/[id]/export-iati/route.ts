import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RelatedActivity {
  relationship_type: string;
  iati_identifier: string;
}

interface Contributor {
  contribution_type: string;
  organizations: {
    id: string;
    iati_org_id: string;
    name: string;
    acronym: string;
    organisation_type: string;
  } | null;
}

interface Transaction {
  uuid: string;
  transaction_type: string;
  transaction_date: string;
  value: number;
  currency: string;
  description?: string;
  provider_org_name?: string;
  provider_org_ref?: string;
  provider_org_type?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_type?: string;
  aid_type?: string;
  aid_type_vocabulary?: string;
  flow_type?: string;
  tied_status?: string;
}

// Helper to escape XML entities
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    // Fetch activity data
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Fetch related activities
    const { data: relatedActivities } = await supabase
      .from('related_activities')
      .select('relationship_type, iati_identifier')
      .eq('source_activity_id', id);

    // Fetch participating organizations
    const { data: contributors } = await supabase
      .from('activity_contributors')
      .select(`
        contribution_type,
        organizations (
          id,
          iati_org_id,
          name,
          acronym,
          organisation_type
        )
      `)
      .eq('activity_id', id);

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('activity_id', id);

    // Build XML
    const xml = buildIATIXML(activity, relatedActivities || [], contributors || [], transactions || []);

    // Return XML with proper content type
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${activity.iati_id || activity.id}.xml"`,
      },
    });
  } catch (error) {
    console.error('Error exporting IATI XML:', error);
    return NextResponse.json(
      { error: 'Failed to export IATI XML' },
      { status: 500 }
    );
  }
}

function buildIATIXML(
  activity: any,
  relatedActivities: RelatedActivity[],
  contributors: Contributor[],
  transactions: Transaction[]
): string {
  const statusMap: Record<string, string> = {
    'pipeline': '1',
    'identification': '1',
    'implementation': '2',
    'finalisation': '3',
    'completion': '3',
    'closed': '4',
    'cancelled': '5',
    'suspended': '6'
  };

  const roleMap: Record<string, string> = {
    'funder': '1',
    'funding': '1',
    'accountable': '2',
    'extending': '3',
    'implementer': '4',
    'implementing': '4'
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03" generated-datetime="${new Date().toISOString()}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://iatistandard.org/203/schema/downloads/iati-activities-schema.xsd">
  <iati-activity last-updated-datetime="${activity.updated_at || new Date().toISOString()}" xml:lang="en" default-currency="${activity.default_currency || 'USD'}">`;

  // IATI Identifier
  if (activity.iati_id) {
    xml += `
    <iati-identifier>${escapeXml(activity.iati_id)}</iati-identifier>`;
  }

  // Title
  if (activity.title || activity.title_narrative) {
    xml += `
    <title>
      <narrative>${escapeXml(activity.title || activity.title_narrative)}</narrative>
    </title>`;
  }

  // Description (general)
  if (activity.description || activity.description_narrative) {
    xml += `
    <description type="1">
      <narrative>${escapeXml(activity.description || activity.description_narrative)}</narrative>
    </description>`;
  }

  // Objectives
  if (activity.objectives) {
    xml += `
    <description type="2">
      <narrative>${escapeXml(activity.objectives)}</narrative>
    </description>`;
  }

  // Target groups
  if (activity.target_groups) {
    xml += `
    <description type="3">
      <narrative>${escapeXml(activity.target_groups)}</narrative>
    </description>`;
  }

  // Participating organizations
  contributors.forEach((contributor) => {
    if (!contributor.organizations) return;
    const org = contributor.organizations;
    const role = roleMap[contributor.contribution_type] || '4';

    xml += `
    <participating-org`;
    if (org.iati_org_id) xml += ` ref="${escapeXml(org.iati_org_id)}"`;
    if (org.organisation_type) xml += ` type="${escapeXml(org.organisation_type)}"`;
    xml += ` role="${role}">
      <narrative>${escapeXml(org.name)}</narrative>
    </participating-org>`;
  });

  // Activity status
  if (activity.activity_status) {
    const statusCode = statusMap[activity.activity_status] || '2';
    xml += `
    <activity-status code="${statusCode}"/>`;
  }

  // Activity dates
  if (activity.planned_start_date) {
    xml += `
    <activity-date type="1" iso-date="${activity.planned_start_date}"/>`;
  }
  if (activity.actual_start_date) {
    xml += `
    <activity-date type="2" iso-date="${activity.actual_start_date}"/>`;
  }
  if (activity.planned_end_date) {
    xml += `
    <activity-date type="3" iso-date="${activity.planned_end_date}"/>`;
  }
  if (activity.actual_end_date) {
    xml += `
    <activity-date type="4" iso-date="${activity.actual_end_date}"/>`;
  }

  // Capital spend
  if (activity.capital_spend_percentage !== null && activity.capital_spend_percentage !== undefined) {
    const capitalSpend = Math.round(activity.capital_spend_percentage * 100) / 100;
    if (capitalSpend >= 0 && capitalSpend <= 100) {
      xml += `
    <capital-spend percentage="${capitalSpend}"/>`;
    }
  }

  // Related activities
  relatedActivities.forEach((related) => {
    xml += `
    <related-activity type="${related.relationship_type}" ref="${escapeXml(related.iati_identifier)}"/>`;
  });

  // Transactions
  transactions.forEach((trans) => {
    xml += `
    <transaction`;
    if (trans.uuid) xml += ` ref="${escapeXml(trans.uuid)}"`;
    xml += `>
      <transaction-type code="${trans.transaction_type}"/>
      <transaction-date iso-date="${trans.transaction_date}"/>
      <value currency="${trans.currency || 'USD'}" value-date="${trans.transaction_date}">${trans.value}</value>`;

    if (trans.description) {
      xml += `
      <description>
        <narrative>${escapeXml(trans.description)}</narrative>
      </description>`;
    }

    if (trans.provider_org_name || trans.provider_org_ref) {
      xml += `
      <provider-org`;
      if (trans.provider_org_ref) xml += ` ref="${escapeXml(trans.provider_org_ref)}"`;
      if (trans.provider_org_type) xml += ` type="${trans.provider_org_type}"`;
      xml += `>`;
      if (trans.provider_org_name) {
        xml += `
        <narrative>${escapeXml(trans.provider_org_name)}</narrative>`;
      }
      xml += `
      </provider-org>`;
    }

    if (trans.receiver_org_name || trans.receiver_org_ref) {
      xml += `
      <receiver-org`;
      if (trans.receiver_org_ref) xml += ` ref="${escapeXml(trans.receiver_org_ref)}"`;
      if (trans.receiver_org_type) xml += ` type="${trans.receiver_org_type}"`;
      xml += `>`;
      if (trans.receiver_org_name) {
        xml += `
        <narrative>${escapeXml(trans.receiver_org_name)}</narrative>`;
      }
      xml += `
      </receiver-org>`;
    }

    if (trans.aid_type) {
      xml += `
      <aid-type code="${trans.aid_type}" vocabulary="${trans.aid_type_vocabulary || '1'}"/>`;
    }

    if (trans.flow_type) {
      xml += `
      <flow-type code="${trans.flow_type}"/>`;
    }

    if (trans.tied_status) {
      xml += `
      <tied-status code="${trans.tied_status}"/>`;
    }

    xml += `
    </transaction>`;
  });

  xml += `
  </iati-activity>
</iati-activities>`;

  return xml;
}
