import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRelationshipTypeName } from '@/data/iati-relationship-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ActivityNode {
  id: string;
  name: string;
  acronym?: string;
  iatiIdentifier?: string;
  type: 'activity';
  group: number;
  status?: string;
  organizationName?: string;
  totalIn?: number;
  totalOut?: number;
}

interface ActivityLink {
  source: string;
  target: string;
  relationshipType: string;
  relationshipCode: string;
  value?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }
    
    console.log('[Activity Graph API] Fetching activity relationships from both tables...');
    
    // Fetch from related_activities table (external/unresolved links)
    const { data: relatedActivitiesData, error: relError } = await supabase
      .from('related_activities')
      .select(`
        id,
        source_activity_id,
        linked_activity_id,
        relationship_type,
        external_iati_identifier,
        external_activity_title,
        created_at
      `);
    
    if (relError) {
      console.error('[Activity Graph API] Error fetching related_activities:', relError);
      // Don't fail completely - continue with activity_relationships
    }
    
    // Fetch from activity_relationships table (internal/resolved links)
    const { data: activityRelationshipsData, error: intRelError } = await supabase
      .from('activity_relationships')
      .select(`
        id,
        activity_id,
        related_activity_id,
        relationship_type,
        external_iati_identifier,
        external_activity_title
      `);
    
    if (intRelError) {
      console.error('[Activity Graph API] Error fetching activity_relationships:', intRelError);
      // Don't fail completely - continue with related_activities
    }
    
    console.log('[Activity Graph API] Raw counts:', {
      related_activities: relatedActivitiesData?.length || 0,
      activity_relationships: activityRelationshipsData?.length || 0
    });
    
    // Normalize relationships from both tables to a common structure
    interface NormalizedRelationship {
      id: string;
      sourceActivityId: string;
      targetActivityId: string | null;
      relationshipType: string;
      externalIatiIdentifier: string | null;
      externalActivityTitle: string | null;
    }
    
    const normalizedRelationships: NormalizedRelationship[] = [];
    
    // Normalize related_activities (uses source_activity_id, linked_activity_id)
    (relatedActivitiesData || []).forEach((rel: any) => {
      if (rel.linked_activity_id || rel.external_iati_identifier) {
        normalizedRelationships.push({
          id: rel.id,
          sourceActivityId: rel.source_activity_id,
          targetActivityId: rel.linked_activity_id,
          relationshipType: rel.relationship_type,
          externalIatiIdentifier: rel.external_iati_identifier,
          externalActivityTitle: rel.external_activity_title
        });
      }
    });
    
    // Normalize activity_relationships (uses activity_id, related_activity_id)
    (activityRelationshipsData || []).forEach((rel: any) => {
      if (rel.related_activity_id || rel.external_iati_identifier) {
        normalizedRelationships.push({
          id: rel.id,
          sourceActivityId: rel.activity_id,
          targetActivityId: rel.related_activity_id,
          relationshipType: rel.relationship_type,
          externalIatiIdentifier: rel.external_iati_identifier,
          externalActivityTitle: rel.external_activity_title
        });
      }
    });
    
    console.log('[Activity Graph API] Total normalized relationships:', normalizedRelationships.length);
    
    // Collect all unique activity IDs (for internal links) from normalized relationships
    const activityIds = new Set<string>();
    // Track external activities separately
    const externalActivities = new Map<string, { identifier: string; title: string }>();
    
    normalizedRelationships.forEach((rel) => {
      if (rel.sourceActivityId) activityIds.add(rel.sourceActivityId);
      if (rel.targetActivityId) {
        activityIds.add(rel.targetActivityId);
      } else if (rel.externalIatiIdentifier) {
        // External activity - store with identifier as key
        externalActivities.set(rel.externalIatiIdentifier, {
          identifier: rel.externalIatiIdentifier,
          title: rel.externalActivityTitle || rel.externalIatiIdentifier
        });
      }
    });
    
    console.log('[Activity Graph API] Unique activity IDs:', activityIds.size);
    console.log('[Activity Graph API] External activities:', externalActivities.size);
    
    // Fetch activity details - no date filtering for relationship graph
    // We want to show ALL activities that have relationships, regardless of dates
    let activities: any[] = [];
    if (activityIds.size > 0) {
      const { data: actData, error: actError } = await supabase
        .from('activities')
        .select(`
          id,
          title_narrative,
          acronym,
          iati_identifier,
          activity_status,
          created_by_org_name,
          created_by_org_acronym,
          activity_date_start_planned,
          activity_date_end_planned
        `)
        .in('id', Array.from(activityIds));
      
      if (actError) {
        console.error('[Activity Graph API] Error fetching activities:', actError);
      } else {
        activities = actData || [];
      }
    }
    
    console.log('[Activity Graph API] Fetched activities:', activities.length);
    console.log('[Activity Graph API] Activity IDs requested:', Array.from(activityIds).slice(0, 5));
    
    // Debug: log which activities were found vs not found
    const foundActivityIds = new Set(activities.map((a: any) => a.id));
    const missingActivityIds = Array.from(activityIds).filter(id => !foundActivityIds.has(id));
    if (missingActivityIds.length > 0) {
      console.log('[Activity Graph API] WARNING - Missing activities:', missingActivityIds);
    }
    
    // Build activity lookup map
    const activityMap = new Map<string, any>();
    activities.forEach((act: any) => {
      activityMap.set(act.id, act);
    });
    
    // Get transaction totals per activity
    const { data: transactionTotals, error: txError } = await supabase
      .from('transactions')
      .select('activity_id, transaction_type, value')
      .in('activity_id', Array.from(activityIds))
      .in('transaction_type', ['2', '3', '4']);
    
    const activityTotals = new Map<string, { totalIn: number; totalOut: number }>();
    transactionTotals?.forEach((tx: any) => {
      const current = activityTotals.get(tx.activity_id) || { totalIn: 0, totalOut: 0 };
      const value = parseFloat(tx.value) || 0;
      // Incoming funds (type 1) count as totalIn, others as totalOut
      if (tx.transaction_type === '1') {
        current.totalIn += value;
      } else {
        current.totalOut += value;
      }
      activityTotals.set(tx.activity_id, current);
    });
    
    // Build nodes
    const nodes: ActivityNode[] = [];
    const nodeIds = new Set<string>();
    let groupCounter = 0;
    
    // Add internal activities as nodes
    activities.forEach((activity: any) => {
      if (!nodeIds.has(activity.id)) {
        const totals = activityTotals.get(activity.id) || { totalIn: 0, totalOut: 0 };
        nodes.push({
          id: activity.id,
          name: activity.title_narrative || activity.iati_identifier || 'Untitled Activity',
          acronym: activity.acronym,
          iatiIdentifier: activity.iati_identifier,
          type: 'activity',
          group: groupCounter++,
          status: activity.activity_status,
          organizationName: activity.created_by_org_acronym || activity.created_by_org_name,
          totalIn: totals.totalIn,
          totalOut: totals.totalOut
        });
        nodeIds.add(activity.id);
      }
    });
    
    // Add external activities as nodes (using IATI identifier as ID)
    externalActivities.forEach((ext, identifier) => {
      if (!nodeIds.has(identifier)) {
        nodes.push({
          id: identifier,
          name: ext.title,
          iatiIdentifier: identifier,
          type: 'activity',
          group: groupCounter++,
          status: 'external',
          organizationName: 'External',
          totalIn: 0,
          totalOut: 0
        });
        nodeIds.add(identifier);
      }
    });
    
    // Build links from normalized relationships (include both internal and external links)
    const links: ActivityLink[] = [];
    const linkSet = new Set<string>();
    
    console.log('[Activity Graph API] Building links from', normalizedRelationships.length, 'relationships');
    console.log('[Activity Graph API] Available nodeIds:', Array.from(nodeIds).slice(0, 10));
    
    normalizedRelationships.forEach((rel, index) => {
      const sourceId = rel.sourceActivityId;
      // For target, use targetActivityId if available, otherwise use externalIatiIdentifier
      const targetId = rel.targetActivityId || rel.externalIatiIdentifier;
      
      // Debug first few relationships
      if (index < 5) {
        console.log(`[Activity Graph API] Relationship ${index}:`, {
          sourceId,
          targetId,
          sourceInNodes: nodeIds.has(sourceId),
          targetInNodes: targetId ? nodeIds.has(targetId) : false,
          relationshipType: rel.relationshipType
        });
      }
      
      // Only include if both activities are in our node set
      if (sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        // Create a unique key for the link to avoid duplicates
        const linkKey = `${sourceId}-${targetId}-${rel.relationshipType}`;
        const reverseLinkKey = `${targetId}-${sourceId}-${rel.relationshipType}`;
        
        if (!linkSet.has(linkKey) && !linkSet.has(reverseLinkKey)) {
          links.push({
            source: sourceId,
            target: targetId,
            relationshipType: getRelationshipTypeName(rel.relationshipType),
            relationshipCode: rel.relationshipType
          });
          linkSet.add(linkKey);
        }
      }
    });
    
    console.log('[Activity Graph API] Built graph:', { nodes: nodes.length, links: links.length });
    
    // Calculate metadata
    const metadata = {
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
      activityCount: nodes.length,
      relationshipCount: links.length,
      totalValue: nodes.reduce((sum, n) => sum + (n.totalIn || 0) + (n.totalOut || 0), 0),
      // Debug info
      debug: {
        relatedActivitiesCount: relatedActivitiesData?.length || 0,
        activityRelationshipsCount: activityRelationshipsData?.length || 0,
        normalizedRelationshipsCount: normalizedRelationships.length,
        activityIdsRequested: Array.from(activityIds),
        activitiesFetched: activities.length,
        externalActivitiesCount: externalActivities.size
      }
    };
    
    return NextResponse.json({
      nodes,
      links,
      metadata
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('[Activity Graph API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to generate activity graph data' },
      { status: 500 }
    );
  }
}






