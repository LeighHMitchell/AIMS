import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    // Fetch current activity details
    const { data: currentActivity, error: activityError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier')
      .eq('id', activityId)
      .single()

    if (activityError || !currentActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    // Fetch participating organizations for current activity
    const { data: currentParticipatingOrgs, error: orgsError } = await supabase
      .from('activity_participating_organizations')
      .select(`
        *,
        organization:organizations(
          id,
          name,
          acronym,
          iati_org_id
        )
      `)
      .eq('activity_id', activityId)

    if (orgsError) {
      console.error('[Network Graph] Error fetching participating organizations:', orgsError)
    }

    // Fetch related activities (both directions)
    const { data: relatedActivities, error: relatedError } = await supabase
      .from('related_activities')
      .select('linked_activity_id, source_activity_id, relationship_type')
      .or(`source_activity_id.eq.${activityId},linked_activity_id.eq.${activityId}`)

    if (relatedError) {
      console.error('[Network Graph] Error fetching related activities:', relatedError)
    }

    // Collect all related activity IDs
    const relatedActivityIds = new Set<string>()
    relatedActivities?.forEach((ra: any) => {
      if (ra.source_activity_id === activityId && ra.linked_activity_id) {
        relatedActivityIds.add(ra.linked_activity_id)
      } else if (ra.linked_activity_id === activityId && ra.source_activity_id) {
        relatedActivityIds.add(ra.source_activity_id)
      }
    })

    // Fetch details of related activities
    let relatedActivitiesDetails: any[] = []
    if (relatedActivityIds.size > 0) {
      const { data: relatedDetails, error: detailsError } = await supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier')
        .in('id', Array.from(relatedActivityIds))

      if (!detailsError && relatedDetails) {
        relatedActivitiesDetails = relatedDetails
      }
    }

    // Fetch participating organizations from related activities
    let relatedParticipatingOrgs: any[] = []
    if (relatedActivityIds.size > 0) {
      const { data: relatedOrgs, error: relatedOrgsError } = await supabase
        .from('activity_participating_organizations')
        .select(`
          *,
          organization:organizations(
            id,
            name,
            acronym,
            iati_org_id
          )
        `)
        .in('activity_id', Array.from(relatedActivityIds))

      if (!relatedOrgsError && relatedOrgs) {
        relatedParticipatingOrgs = relatedOrgs
      }
    }

    // Build nodes and links
    const nodes: any[] = []
    const links: any[] = []
    const nodeMap = new Map<string, any>()
    let groupCounter = 0

    // Add current activity as a node
    const currentActivityNode = {
      id: `activity-${currentActivity.id}`,
      type: 'activity' as const,
      name: currentActivity.title_narrative || currentActivity.iati_identifier || 'Unknown Activity',
      group: groupCounter++,
      activityId: currentActivity.id
    }
    nodes.push(currentActivityNode)
    nodeMap.set(currentActivityNode.id, currentActivityNode)

    // Add related activities as nodes
    relatedActivitiesDetails.forEach((activity: any) => {
      const activityNode = {
        id: `activity-${activity.id}`,
        type: 'activity' as const,
        name: activity.title_narrative || activity.iati_identifier || 'Unknown Activity',
        group: groupCounter++,
        activityId: activity.id
      }
      nodes.push(activityNode)
      nodeMap.set(activityNode.id, activityNode)

      // Create link between current activity and related activity
      links.push({
        source: `activity-${currentActivity.id}`,
        target: `activity-${activity.id}`,
        type: 'related'
      })
    })

    // Add organizations as nodes and create links
    const orgNodeMap = new Map<string, any>()

    // Process current activity's participating organizations
    currentParticipatingOrgs?.forEach((org: any) => {
      const orgId = org.organization?.id || `org-${org.organization_id || org.id}`
      const orgName = org.organization?.acronym || org.organization?.name || org.organization_name || 'Unknown Organization'

      if (!orgNodeMap.has(orgId)) {
        const orgNode = {
          id: `org-${orgId}`,
          type: 'organization' as const,
          name: orgName,
          group: groupCounter++,
          organizationId: orgId
        }
        nodes.push(orgNode)
        orgNodeMap.set(orgId, orgNode)
        nodeMap.set(orgNode.id, orgNode)
      }

      // Link organization to current activity
      links.push({
        source: `org-${orgId}`,
        target: `activity-${currentActivity.id}`,
        type: 'participates'
      })
    })

    // Process related activities' participating organizations
    relatedParticipatingOrgs.forEach((org: any) => {
      const orgId = org.organization?.id || `org-${org.organization_id || org.id}`
      const orgName = org.organization?.acronym || org.organization?.name || org.organization_name || 'Unknown Organization'
      const activityId = org.activity_id

      if (!orgNodeMap.has(orgId)) {
        const orgNode = {
          id: `org-${orgId}`,
          type: 'organization' as const,
          name: orgName,
          group: groupCounter++,
          organizationId: orgId
        }
        nodes.push(orgNode)
        orgNodeMap.set(orgId, orgNode)
        nodeMap.set(orgNode.id, orgNode)
      }

      // Link organization to its activity
      if (nodeMap.has(`activity-${activityId}`)) {
        links.push({
          source: `org-${orgId}`,
          target: `activity-${activityId}`,
          type: 'participates'
        })
      }
    })

    // Create links between organizations that participate in the same activities (collaboration)
    const orgToActivities = new Map<string, Set<string>>()
    
    links.forEach((link: any) => {
      if (link.source.startsWith('org-') && link.target.startsWith('activity-')) {
        const orgId = link.source
        const activityId = link.target
        
        if (!orgToActivities.has(orgId)) {
          orgToActivities.set(orgId, new Set())
        }
        orgToActivities.get(orgId)!.add(activityId)
      }
    })

    // Find organizations that share activities (collaborate)
    const orgIdsArray = Array.from(orgToActivities.keys())
    for (let i = 0; i < orgIdsArray.length; i++) {
      for (let j = i + 1; j < orgIdsArray.length; j++) {
        const org1Activities = orgToActivities.get(orgIdsArray[i])!
        const org2Activities = orgToActivities.get(orgIdsArray[j])!
        
        // Check if they share any activity
        const sharedActivities = Array.from(org1Activities).filter(a => org2Activities.has(a))
        if (sharedActivities.length > 0) {
          links.push({
            source: orgIdsArray[i],
            target: orgIdsArray[j],
            type: 'collaborates'
          })
        }
      }
    }

    return NextResponse.json({
      nodes,
      links
    })
  } catch (error) {
    console.error('[Network Graph] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}












