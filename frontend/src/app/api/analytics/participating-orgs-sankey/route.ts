import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// IATI Participating Org Role Codes
const ROLE_CODES = {
  FUNDING: 1,
  ACCOUNTABLE: 2,
  EXTENDING: 3,
  IMPLEMENTING: 4, // Also called "Responsible"
};

const ROLE_LABELS: Record<number, string> = {
  1: 'Funding',
  2: 'Accountable',
  3: 'Extending',
  4: 'Implementing',
};

// Map role_type text to IATI code
const ROLE_TYPE_TO_CODE: Record<string, number> = {
  'funding': 1,
  'funder': 1,
  'accountable': 2,
  'extending': 3,
  'implementing': 4,
  'implementer': 4,
  'responsible': 4,
};

interface SankeyNode {
  id: string;
  name: string;
  role: number;
  roleLabel: string;
  column: number; // 0=Funding, 1=Extending, 2=Accountable, 3=Implementing
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  activityCount: number;
}

interface OrgActivityData {
  activity_id: string;
  organization_id: string;
  org_name: string;
  role: number;
  budget_value: number | null;
}

export async function GET(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase;

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'count'; // 'count' or 'value'

    // Get all participating orgs with their activities
    const { data: participatingOrgs, error: orgError } = await supabaseAdmin
      .from('activity_participating_organizations')
      .select(`
        id,
        activity_id,
        role_type,
        iati_role_code,
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .not('organization_id', 'is', null);

    if (orgError) {
      console.error('[ParticipatingOrgsSankey] Error fetching orgs:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch participating organizations', details: orgError.message },
        { status: 500 }
      );
    }

    if (!participatingOrgs || participatingOrgs.length === 0) {
      return NextResponse.json({
        nodes: [],
        links: [],
        summary: {
          totalActivities: 0,
          totalOrganizations: 0,
          totalBudget: 0,
          byRole: {
            funding: 0,
            accountable: 0,
            extending: 0,
            implementing: 0,
          },
        },
      });
    }

    // Get activity budgets separately
    const activityIds = [...new Set(participatingOrgs.map((po: any) => po.activity_id))];

    const { data: budgetData } = await supabaseAdmin
      .from('activity_budgets')
      .select('activity_id, value')
      .in('activity_id', activityIds);

    // Create a map of activity_id to total budget
    const activityBudgetMap = new Map<string, number>();
    budgetData?.forEach((b: any) => {
      const value = parseFloat(b.value?.toString() || '0') || 0;
      activityBudgetMap.set(
        b.activity_id,
        (activityBudgetMap.get(b.activity_id) || 0) + value
      );
    });

    // Process data: group by activity to find org relationships
    const activityOrgsMap = new Map<string, OrgActivityData[]>();
    const orgNames = new Map<string, string>();

    participatingOrgs.forEach((po: any) => {
      if (!po.organization_id || !po.activity_id) return;

      const orgName = po.organizations?.name || 'Unknown Organization';
      orgNames.set(po.organization_id, orgName);

      // Determine role code - prefer iati_role_code, fall back to role_type mapping
      let roleCode = po.iati_role_code;
      if (!roleCode && po.role_type) {
        roleCode = ROLE_TYPE_TO_CODE[po.role_type.toLowerCase()] || 4;
      }
      if (!roleCode) roleCode = 4; // Default to implementing

      // Only include valid roles (1-4)
      if (roleCode < 1 || roleCode > 4) return;

      const orgData: OrgActivityData = {
        activity_id: po.activity_id,
        organization_id: po.organization_id,
        org_name: orgName,
        role: roleCode,
        budget_value: activityBudgetMap.get(po.activity_id) || 0,
      };

      if (!activityOrgsMap.has(po.activity_id)) {
        activityOrgsMap.set(po.activity_id, []);
      }
      activityOrgsMap.get(po.activity_id)!.push(orgData);
    });

    // Build nodes and links based on the flow:
    // Funding (1) → Extending (3) → Accountable (2) → Implementing (4)
    const flowOrder = [
      ROLE_CODES.FUNDING,     // Column 0
      ROLE_CODES.EXTENDING,   // Column 1
      ROLE_CODES.ACCOUNTABLE, // Column 2
      ROLE_CODES.IMPLEMENTING // Column 3
    ];

    const nodesMap = new Map<string, SankeyNode>();
    const linksMap = new Map<string, SankeyLink>();

    // For each activity, create links between consecutive roles
    activityOrgsMap.forEach((orgs, activityId) => {
      // Group orgs by role for this activity
      const orgsByRole = new Map<number, OrgActivityData[]>();
      orgs.forEach((org) => {
        if (!orgsByRole.has(org.role)) {
          orgsByRole.set(org.role, []);
        }
        orgsByRole.get(org.role)!.push(org);
      });

      // Get budget value for this activity
      const activityBudget = activityBudgetMap.get(activityId) || 0;

      // Create nodes for each org
      orgs.forEach((org) => {
        const nodeId = `${org.role}-${org.organization_id}`;
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            name: org.org_name,
            role: org.role,
            roleLabel: ROLE_LABELS[org.role] || 'Unknown',
            column: flowOrder.indexOf(org.role),
          });
        }
      });

      // Create links between consecutive roles in the flow
      for (let i = 0; i < flowOrder.length - 1; i++) {
        const sourceRole = flowOrder[i];
        const targetRole = flowOrder[i + 1];

        const sourceOrgs = orgsByRole.get(sourceRole) || [];
        const targetOrgs = orgsByRole.get(targetRole) || [];

        // If both roles have orgs, create links
        if (sourceOrgs.length > 0 && targetOrgs.length > 0) {
          // Distribute value equally among all source-target combinations
          const valuePerLink = metric === 'value'
            ? activityBudget / (sourceOrgs.length * targetOrgs.length)
            : 1;

          sourceOrgs.forEach((sourceOrg) => {
            targetOrgs.forEach((targetOrg) => {
              const sourceNodeId = `${sourceOrg.role}-${sourceOrg.organization_id}`;
              const targetNodeId = `${targetOrg.role}-${targetOrg.organization_id}`;
              const linkKey = `${sourceNodeId}|${targetNodeId}`;

              if (!linksMap.has(linkKey)) {
                linksMap.set(linkKey, {
                  source: sourceNodeId,
                  target: targetNodeId,
                  value: 0,
                  activityCount: 0,
                });
              }

              const link = linksMap.get(linkKey)!;
              link.value += valuePerLink;
              link.activityCount += 1;
            });
          });
        }
      }
    });

    // Convert to arrays and sort
    const nodes = Array.from(nodesMap.values()).sort((a, b) => {
      if (a.column !== b.column) return a.column - b.column;
      return a.name.localeCompare(b.name);
    });

    const links = Array.from(linksMap.values())
      .filter((link) => link.value > 0)
      .sort((a, b) => b.value - a.value);

    // Calculate summary statistics
    const uniqueActivities = new Set(activityOrgsMap.keys());
    const uniqueOrgs = new Set<string>();
    const roleCount: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalBudget = 0;

    participatingOrgs.forEach((po: any) => {
      if (po.organization_id) {
        uniqueOrgs.add(po.organization_id);
      }
      let roleCode = po.iati_role_code;
      if (!roleCode && po.role_type) {
        roleCode = ROLE_TYPE_TO_CODE[po.role_type.toLowerCase()] || 4;
      }
      if (roleCode >= 1 && roleCode <= 4) {
        roleCount[roleCode] = (roleCount[roleCode] || 0) + 1;
      }
    });

    activityBudgetMap.forEach((budget) => {
      totalBudget += budget;
    });

    return NextResponse.json({
      nodes,
      links,
      summary: {
        totalActivities: uniqueActivities.size,
        totalOrganizations: uniqueOrgs.size,
        totalBudget,
        byRole: {
          funding: roleCount[1] || 0,
          accountable: roleCount[2] || 0,
          extending: roleCount[3] || 0,
          implementing: roleCount[4] || 0,
        },
      },
      metric,
    });
  } catch (error) {
    console.error('[ParticipatingOrgsSankey] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
