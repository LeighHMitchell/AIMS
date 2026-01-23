import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRelationshipTypeName } from '@/data/iati-relationship-types';

interface GraphNode {
  id: string;
  title: string;
  iatiId: string;
  activityId: string;
  organizationName: string;
  organizationAcronym: string;
  status: string;
  acronym: string;
  distance: number; // Distance from the current activity (0 = current)
  icon?: string | null;
}

interface GraphEdge {
  source: string;
  target: string;
  relationshipType: string;
  relationshipLabel: string;
  narrative?: string;
}

interface ActivityData {
  id: string;
  title_narrative: string;
  acronym?: string;
  other_identifier?: string;
  iati_identifier?: string;
  activity_status?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  icon?: string | null;
}

const MAX_NODES = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  const { searchParams } = new URL(request.url);
  const depth = searchParams.get('depth') || '1'; // '1', '2', or 'all'

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Track visited activities and their data
    const visitedIds = new Set<string>();
    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const edgeKeys = new Set<string>(); // To prevent duplicate edges

    // BFS queue: [activityId, distance]
    const queue: [string, number][] = [[activityId, 0]];
    visitedIds.add(activityId);

    // Determine max depth based on parameter
    const maxDepth = depth === 'all' ? Infinity : parseInt(depth, 10);

    // First, fetch the current activity details
    const { data: currentActivityData, error: currentError } = await supabase
      .from('activities')
      .select('id, title_narrative, acronym, other_identifier, iati_identifier, activity_status, created_by_org_name, created_by_org_acronym, icon')
      .eq('id', activityId)
      .single();

    if (currentError) {
      console.error('Error fetching current activity:', currentError);
      return NextResponse.json(
        { error: 'Failed to fetch current activity' },
        { status: 500 }
      );
    }

    // Add current activity as first node
    nodesMap.set(activityId, {
      id: activityId,
      title: currentActivityData?.title_narrative || 'Unknown Activity',
      iatiId: currentActivityData?.iati_identifier || '',
      activityId: currentActivityData?.other_identifier || '',
      organizationName: currentActivityData?.created_by_org_name || '',
      organizationAcronym: currentActivityData?.created_by_org_acronym || '',
      status: currentActivityData?.activity_status || '',
      acronym: currentActivityData?.acronym || '',
      distance: 0,
      icon: currentActivityData?.icon
    });

    // BFS traversal
    while (queue.length > 0 && nodesMap.size < MAX_NODES) {
      const [currentId, currentDistance] = queue.shift()!;

      // Don't fetch relationships beyond max depth
      if (currentDistance >= maxDepth) continue;

      // Fetch outgoing relationships
      const { data: outgoingLinks, error: outError } = await supabase
        .from('activity_relationships')
        .select(`
          id,
          related_activity_id,
          relationship_type,
          narrative,
          activities!related_activity_id (
            id,
            title_narrative,
            acronym,
            other_identifier,
            iati_identifier,
            activity_status,
            created_by_org_name,
            created_by_org_acronym,
            icon
          )
        `)
        .eq('activity_id', currentId);

      if (outError && outError.code !== '42P01') {
        console.error('Error fetching outgoing links:', outError);
      }

      // Fetch incoming relationships
      const { data: incomingLinks, error: inError } = await supabase
        .from('activity_relationships')
        .select(`
          id,
          activity_id,
          relationship_type,
          narrative,
          activities!activity_id (
            id,
            title_narrative,
            acronym,
            other_identifier,
            iati_identifier,
            activity_status,
            created_by_org_name,
            created_by_org_acronym,
            icon
          )
        `)
        .eq('related_activity_id', currentId);

      if (inError && inError.code !== '42P01') {
        console.error('Error fetching incoming links:', inError);
      }

      // Process outgoing links
      for (const link of outgoingLinks || []) {
        const relatedId = link.related_activity_id;
        const activityData = link.activities as unknown as ActivityData;

        // Create edge key to prevent duplicates
        const edgeKey = `${currentId}-${relatedId}-${link.relationship_type}`;
        if (!edgeKeys.has(edgeKey)) {
          edgeKeys.add(edgeKey);
          edges.push({
            source: currentId,
            target: relatedId,
            relationshipType: link.relationship_type,
            relationshipLabel: getRelationshipTypeName(link.relationship_type),
            narrative: link.narrative
          });
        }

        // Add node if not visited
        if (!visitedIds.has(relatedId) && nodesMap.size < MAX_NODES) {
          visitedIds.add(relatedId);
          nodesMap.set(relatedId, {
            id: relatedId,
            title: activityData?.title_narrative || 'Unknown Activity',
            iatiId: activityData?.iati_identifier || '',
            activityId: activityData?.other_identifier || '',
            organizationName: activityData?.created_by_org_name || '',
            organizationAcronym: activityData?.created_by_org_acronym || '',
            status: activityData?.activity_status || '',
            acronym: activityData?.acronym || '',
            distance: currentDistance + 1,
            icon: activityData?.icon
          });
          queue.push([relatedId, currentDistance + 1]);
        }
      }

      // Process incoming links
      for (const link of incomingLinks || []) {
        const relatedId = link.activity_id;
        const activityData = link.activities as unknown as ActivityData;

        // Create edge key to prevent duplicates (reverse direction)
        const edgeKey = `${relatedId}-${currentId}-${link.relationship_type}`;
        if (!edgeKeys.has(edgeKey)) {
          edgeKeys.add(edgeKey);
          edges.push({
            source: relatedId,
            target: currentId,
            relationshipType: link.relationship_type,
            relationshipLabel: getRelationshipTypeName(link.relationship_type),
            narrative: link.narrative
          });
        }

        // Add node if not visited
        if (!visitedIds.has(relatedId) && nodesMap.size < MAX_NODES) {
          visitedIds.add(relatedId);
          nodesMap.set(relatedId, {
            id: relatedId,
            title: activityData?.title_narrative || 'Unknown Activity',
            iatiId: activityData?.iati_identifier || '',
            activityId: activityData?.other_identifier || '',
            organizationName: activityData?.created_by_org_name || '',
            organizationAcronym: activityData?.created_by_org_acronym || '',
            status: activityData?.activity_status || '',
            acronym: activityData?.acronym || '',
            distance: currentDistance + 1,
            icon: activityData?.icon
          });
          queue.push([relatedId, currentDistance + 1]);
        }
      }
    }

    // Convert nodes map to array
    const nodes = Array.from(nodesMap.values());

    // Check if we hit the limit
    const truncated = queue.length > 0 || nodesMap.size >= MAX_NODES;

    return NextResponse.json({
      nodes,
      edges,
      truncated,
      totalCount: nodes.length,
      currentActivityId: activityId
    });
  } catch (error: any) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data', details: error.message },
      { status: 500 }
    );
  }
}
