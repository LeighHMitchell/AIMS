import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RelatedActivity {
  relationship_type: string;
  iati_identifier: string;
}

interface ReportingOrg {
  iati_org_id: string | null;
  name: string | null;
  acronym: string | null;
  type: string | null;
  reporting_org_ref: string | null;
  reporting_org_type: string | null;
  reporting_org_name: string | null;
  reporting_org_secondary_reporter: boolean | null;
}

interface Sector {
  sector_code: string;
  sector_name?: string | null;
  percentage?: number | null;
  sector_vocabulary?: string | null;
}

interface ParticipatingOrg {
  iati_role_code: number | null;
  role_type: string | null;
  iati_org_ref: string | null;
  org_type_code: string | null;
  org_type: string | null;
  narrative: string | null;
  activity_id_ref: string | null;
  org_activity_id: string | null;
  crs_channel_code: string | null;
  display_order: number | null;
  organizations: {
    iati_org_id: string | null;
    name: string | null;
    acronym: string | null;
    type: string | null;
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
  provider_activity_ref?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_type?: string;
  receiver_activity_ref?: string;
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

    // Fetch related activities from the legacy related_activities table (stores external IATI identifiers)
    const { data: legacyRelatedActivities } = await supabase
      .from('related_activities')
      .select('relationship_type, iati_identifier')
      .eq('source_activity_id', id);

    // Also fetch from activity_relationships (used by pooled fund UI and Linked Activities tab)
    // Join to activities to resolve their IATI identifiers
    const { data: activityRelationships } = await supabase
      .from('activity_relationships')
      .select(`
        relationship_type,
        activities!related_activity_id (
          iati_identifier,
          iati_id
        )
      `)
      .eq('activity_id', id);

    // Merge both sources, deduplicating by IATI identifier
    const relatedActivitiesMap = new Map<string, RelatedActivity>();
    for (const r of (legacyRelatedActivities || [])) {
      if (r.iati_identifier) {
        relatedActivitiesMap.set(r.iati_identifier, r);
      }
    }
    for (const r of (activityRelationships || [])) {
      const linked = r.activities as any;
      const iatiId = linked?.iati_identifier || linked?.iati_id;
      if (iatiId) {
        relatedActivitiesMap.set(iatiId, {
          relationship_type: r.relationship_type,
          iati_identifier: iatiId,
        });
      }
    }
    const relatedActivities = Array.from(relatedActivitiesMap.values());

    // Fetch the reporting organisation (mandatory in IATI). The IATI org type lives in
    // the `type` column; orgs may also carry dedicated reporting-org identity columns.
    let reportingOrg: ReportingOrg | null = null;
    if (activity.reporting_org_id) {
      const { data: ro } = await supabase
        .from('organizations')
        .select('iati_org_id, name, acronym, type, reporting_org_ref, reporting_org_type, reporting_org_name, reporting_org_secondary_reporter')
        .eq('id', activity.reporting_org_id)
        .single();
      reportingOrg = ro as ReportingOrg | null;
    }

    // Fetch participating organizations
    const { data: participatingOrgs } = await supabase
      .from('activity_participating_organizations')
      .select(`
        iati_role_code,
        role_type,
        iati_org_ref,
        org_type_code,
        org_type,
        narrative,
        activity_id_ref,
        org_activity_id,
        crs_channel_code,
        display_order,
        organizations:organization_id (
          iati_org_id,
          name,
          acronym,
          type
        )
      `)
      .eq('activity_id', id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    // Fetch sectors
    const { data: sectors } = await supabase
      .from('activity_sectors')
      .select('sector_code, sector_name, percentage, sector_vocabulary')
      .eq('activity_id', id);

    // Fetch transactions
    const { data: rawTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('activity_id', id);

    // Resolve provider_activity_uuid and receiver_activity_uuid to IATI identifiers
    const linkedUuids = new Set<string>();
    for (const t of (rawTransactions || [])) {
      if (t.provider_activity_uuid) linkedUuids.add(t.provider_activity_uuid);
      if (t.receiver_activity_uuid) linkedUuids.add(t.receiver_activity_uuid);
    }
    const activityRefMap: Record<string, string> = {};
    if (linkedUuids.size > 0) {
      const { data: linkedActivities } = await supabase
        .from('activities')
        .select('id, iati_identifier, iati_id')
        .in('id', Array.from(linkedUuids));
      for (const a of (linkedActivities || [])) {
        const iatiId = a.iati_identifier || a.iati_id;
        if (iatiId) activityRefMap[a.id] = iatiId;
      }
    }

    // Annotate transactions with resolved activity-ref values
    const transactions: Transaction[] = (rawTransactions || []).map((t: any) => ({
      ...t,
      provider_activity_ref: t.provider_activity_uuid ? activityRefMap[t.provider_activity_uuid] : undefined,
      receiver_activity_ref: t.receiver_activity_uuid ? activityRefMap[t.receiver_activity_uuid] : undefined,
    }));

    // Build XML
    const xml = buildIATIXML(activity, reportingOrg, relatedActivities, participatingOrgs || [], sectors || [], transactions);

    // Return XML with proper content type
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${activity.iati_identifier || activity.id}.xml"`,
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
  reportingOrg: ReportingOrg | null,
  relatedActivities: RelatedActivity[],
  participatingOrgs: ParticipatingOrg[],
  sectors: Sector[],
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

  // IATI hierarchy: pooled funds are hierarchy=1 (parent), child activities are hierarchy=2.
  // Fall back to the stored hierarchy column, then to 1 as the default for standard activities.
  const hierarchyValue = activity.hierarchy ?? (activity.is_pooled_fund ? 1 : undefined);
  const hierarchyAttr = hierarchyValue != null ? ` hierarchy="${hierarchyValue}"` : '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03" generated-datetime="${new Date().toISOString()}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://iatistandard.org/203/schema/downloads/iati-activities-schema.xsd">
  <iati-activity last-updated-datetime="${activity.updated_at || new Date().toISOString()}" xml:lang="en" default-currency="${activity.default_currency || 'USD'}"${hierarchyAttr}>`;

  // Reporting-org identity: prefer the org's dedicated reporting-org columns, then its
  // generic IATI ref/type/name.
  const reportingRef = (reportingOrg?.reporting_org_ref || reportingOrg?.iati_org_id || '').trim();
  const reportingType = (reportingOrg?.reporting_org_type || reportingOrg?.type || '').toString().trim();
  const reportingName =
    (reportingOrg?.reporting_org_name || reportingOrg?.name || reportingOrg?.acronym || '').trim() ||
    'Unspecified reporting organisation';

  // IATI Identifier (mandatory). Prefer the stored identifier; otherwise construct
  // a deterministic one from the reporting-org ref + activity UUID so the element is
  // never omitted (an activity without an identifier is not schema-valid).
  const iatiIdentifier =
    (activity.iati_identifier && String(activity.iati_identifier).trim()) ||
    (reportingRef ? `${reportingRef}-${activity.id}` : activity.id);
  xml += `
    <iati-identifier>${escapeXml(iatiIdentifier)}</iati-identifier>`;

  // Reporting organisation (mandatory). @ref and @type are schema-required, so they are
  // always emitted (empty only when the reporting org is unknown — a data-completeness
  // gap rather than an export bug).
  xml += `
    <reporting-org ref="${escapeXml(reportingRef)}" type="${escapeXml(reportingType)}"`;
  if (reportingOrg?.reporting_org_secondary_reporter) xml += ` secondary-reporter="1"`;
  xml += `>
      <narrative>${escapeXml(reportingName)}</narrative>
    </reporting-org>`;

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

  // Participating organizations. IATI requires at least one participating-org, so when
  // none are recorded we fall back to the reporting org as the funding party.
  let participatingCount = 0;
  participatingOrgs.forEach((po) => {
    const org = po.organizations;
    // role is mandatory: prefer the stored IATI code, then map the text role_type.
    const role =
      (po.iati_role_code != null ? String(po.iati_role_code) : '') ||
      (po.role_type ? roleMap[po.role_type] : '') ||
      '4';
    const ref = (po.iati_org_ref || org?.iati_org_id || '').trim();
    const type = (po.org_type_code || po.org_type || org?.type || '').toString().trim();
    const name = (po.narrative || org?.name || org?.acronym || '').trim();
    const activityId = (po.activity_id_ref || po.org_activity_id || '').trim();

    xml += `
    <participating-org`;
    if (ref) xml += ` ref="${escapeXml(ref)}"`;
    if (type) xml += ` type="${escapeXml(type)}"`;
    xml += ` role="${escapeXml(role)}"`;
    if (activityId) xml += ` activity-id="${escapeXml(activityId)}"`;
    if (po.crs_channel_code) xml += ` crs-channel-code="${escapeXml(String(po.crs_channel_code))}"`;
    if (name) {
      xml += `>
      <narrative>${escapeXml(name)}</narrative>
    </participating-org>`;
    } else {
      // narrative is optional for participating-org; emit a self-closing element.
      xml += `/>`;
    }
    participatingCount++;
  });
  if (participatingCount === 0) {
    xml += `
    <participating-org`;
    if (reportingRef) xml += ` ref="${escapeXml(reportingRef)}"`;
    if (reportingType) xml += ` type="${escapeXml(reportingType)}"`;
    xml += ` role="1">
      <narrative>${escapeXml(reportingName)}</narrative>
    </participating-org>`;
  }

  // Activity status. Values are usually stored as the IATI numeric code already
  // (1-6); only fall back to the text-label map for legacy string values.
  if (activity.activity_status) {
    const raw = String(activity.activity_status).trim();
    const statusCode = /^[1-6]$/.test(raw) ? raw : (statusMap[raw] || '2');
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

  // Recipient countries (schema order: after activity-date, before sector)
  const recipientCountries = Array.isArray(activity.recipient_countries)
    ? activity.recipient_countries
    : [];
  recipientCountries.forEach((rc: any) => {
    // Stored shape is typically { country: { code }, percentage }, but tolerate
    // { code } and bare string forms too.
    const code = (typeof rc === 'string' ? rc : rc?.country?.code ?? rc?.code)?.toString().trim();
    if (!code) return;
    const pct =
      rc && typeof rc === 'object' && rc.percentage != null && !isNaN(Number(rc.percentage))
        ? ` percentage="${Number(rc.percentage)}"`
        : '';
    xml += `
    <recipient-country code="${escapeXml(code)}"${pct}/>`;
  });

  // Sectors
  sectors.forEach((sector) => {
    if (!sector.sector_code) return;
    xml += `
    <sector vocabulary="${escapeXml(sector.sector_vocabulary || '1')}" code="${escapeXml(String(sector.sector_code))}"`;
    if (sector.percentage != null && !isNaN(Number(sector.percentage))) {
      xml += ` percentage="${Number(sector.percentage)}"`;
    }
    if (sector.sector_name) {
      xml += `>
      <narrative>${escapeXml(sector.sector_name)}</narrative>
    </sector>`;
    } else {
      xml += `/>`;
    }
  });

  // Capital spend
  if (activity.capital_spend_percentage !== null && activity.capital_spend_percentage !== undefined) {
    const capitalSpend = Math.round(activity.capital_spend_percentage * 100) / 100;
    if (capitalSpend >= 0 && capitalSpend <= 100) {
      xml += `
    <capital-spend percentage="${capitalSpend}"/>`;
    }
  }

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

    if (trans.provider_org_name || trans.provider_org_ref || trans.provider_activity_ref) {
      xml += `
      <provider-org`;
      if (trans.provider_org_ref) xml += ` ref="${escapeXml(trans.provider_org_ref)}"`;
      if (trans.provider_org_type) xml += ` type="${trans.provider_org_type}"`;
      if (trans.provider_activity_ref) xml += ` provider-activity-id="${escapeXml(trans.provider_activity_ref)}"`;
      xml += `>`;
      if (trans.provider_org_name) {
        xml += `
        <narrative>${escapeXml(trans.provider_org_name)}</narrative>`;
      }
      xml += `
      </provider-org>`;
    }

    if (trans.receiver_org_name || trans.receiver_org_ref || trans.receiver_activity_ref) {
      xml += `
      <receiver-org`;
      if (trans.receiver_org_ref) xml += ` ref="${escapeXml(trans.receiver_org_ref)}"`;
      if (trans.receiver_org_type) xml += ` type="${trans.receiver_org_type}"`;
      if (trans.receiver_activity_ref) xml += ` receiver-activity-id="${escapeXml(trans.receiver_activity_ref)}"`;
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

  // Related activities (schema order: after transaction)
  relatedActivities.forEach((related) => {
    xml += `
    <related-activity type="${escapeXml(String(related.relationship_type))}" ref="${escapeXml(related.iati_identifier)}"/>`;
  });

  xml += `
  </iati-activity>
</iati-activities>`;

  return xml;
}
