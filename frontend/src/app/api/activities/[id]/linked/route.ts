import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getRelationshipTypeName } from '@/data/iati-relationship-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Fetch linked activities
    const { data: linkedActivities, error } = await supabase
      .from('activity_relationships')
      .select(`
        id,
        related_activity_id,
        relationship_type,
        narrative,
        created_at,
        created_by,
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
      .eq('activity_id', activityId);

    if (error) throw error;

    // Transform the data
    const transformedLinks = (linkedActivities || []).map((link: any) => ({
      id: link.id,
      activityId: link.related_activity_id,
      activityTitle: link.activities?.title_narrative || 'Unknown Activity',
      acronym: link.activities?.acronym || '',
      otherIdentifier: link.activities?.other_identifier || '',
      iatiIdentifier: link.activities?.iati_identifier || '',
      relationshipType: link.relationship_type,
      relationshipTypeLabel: getRelationshipTypeName(link.relationship_type),
      narrative: link.narrative,
      isExternal: false,
      createdBy: link.created_by,
      createdAt: link.created_at,
      direction: 'outgoing',
      organizationName: link.activities?.created_by_org_name,
      organizationAcronym: link.activities?.created_by_org_acronym,
      icon: link.activities?.icon,
      status: link.activities?.activity_status
    }));

    // Also fetch where this activity is the related one (incoming links)
    const { data: incomingLinks, error: incomingError } = await supabase
      .from('activity_relationships')
      .select(`
        id,
        activity_id,
        relationship_type,
        narrative,
        created_at,
        created_by,
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
      .eq('related_activity_id', activityId);

    if (incomingError) throw incomingError;

    const transformedIncoming = (incomingLinks || []).map((link: any) => ({
      id: link.id,
      activityId: link.activity_id,
      activityTitle: link.activities?.title_narrative || 'Unknown Activity',
      acronym: link.activities?.acronym || '',
      otherIdentifier: link.activities?.other_identifier || '',
      iatiIdentifier: link.activities?.iati_identifier || '',
      relationshipType: link.relationship_type,
      relationshipTypeLabel: getRelationshipTypeName(link.relationship_type),
      narrative: link.narrative,
      isExternal: false,
      createdBy: link.created_by,
      createdAt: link.created_at,
      direction: 'incoming',
      organizationName: link.activities?.created_by_org_name,
      organizationAcronym: link.activities?.created_by_org_acronym,
      icon: link.activities?.icon,
      status: link.activities?.activity_status
    }));

    // Combine and return
    const allLinks = [...transformedLinks, ...transformedIncoming];

    return NextResponse.json(allLinks);
  } catch (error: any) {
    console.error('Error fetching linked activities:', error);
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      return NextResponse.json([]);
    }
    return NextResponse.json(
      { error: 'Failed to fetch linked activities', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { linkedActivityId, relationshipType, narrative } = body;

    if (!linkedActivityId || !relationshipType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if link already exists
    const { data: existing, error: existingError } = await supabase
      .from('activity_relationships')
      .select('id')
      .eq('activity_id', activityId)
      .eq('related_activity_id', linkedActivityId)
      .single();

    // If table doesn't exist, return specific error
    if (existingError && existingError.code === '42P01') {
      return NextResponse.json(
        { 
          error: 'Database table not found',
          details: 'The activity_relationships table does not exist. Please create it using the provided SQL migration.'
        },
        { status: 503 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'This relationship already exists' },
        { status: 400 }
      );
    }

    // Create the relationship
    const { data, error } = await supabase
      .from('activity_relationships')
      .insert({
        activity_id: activityId,
        related_activity_id: linkedActivityId,
        relationship_type: relationshipType,
        narrative: narrative || null,
        created_by: 'current-user' // TODO: Get from auth
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      if (error.code === '42P01') {
        return NextResponse.json(
          { 
            error: 'Database table not found',
            details: 'The activity_relationships table does not exist. Please create it using the provided SQL migration.'
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating linked activity:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create link',
        details: error.message 
      },
      { status: 500 }
    );
  }
}