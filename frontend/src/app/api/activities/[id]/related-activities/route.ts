import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getRelationshipTypeName } from '@/data/iati-relationship-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const relatedActivities: any[] = [];

    // 1. Fetch linked activities (from activity_relationships table)
    const { data: linkedActivities, error: linkedError } = await supabase
      .from('activity_relationships')
      .select(`
        id,
        related_activity_id,
        external_iati_identifier,
        external_activity_title,
        is_resolved,
        relationship_type,
        narrative,
        created_at,
        activities!related_activity_id (
          id,
          title_narrative,
          acronym,
          iati_identifier,
          activity_status,
          created_by_org_name,
          created_by_org_acronym,
          icon
        )
      `)
      .eq('activity_id', activityId);

    if (linkedError) {
      console.error('Error fetching linked activities:', linkedError);
    } else if (linkedActivities) {
      linkedActivities.forEach((link: any) => {
        // Handle external (unresolved) links
        if (link.external_iati_identifier && !link.is_resolved) {
          relatedActivities.push({
            id: link.id, // Use relationship ID for external links
            title: link.external_activity_title || link.external_iati_identifier,
            acronym: '',
            iatiIdentifier: link.external_iati_identifier,
            status: '',
            organizationName: '',
            organizationAcronym: '',
            icon: '',
            relationshipType: getRelationshipTypeName(link.relationship_type),
            relationshipTypeCode: link.relationship_type, // Raw code for comparison
            relationshipNarrative: link.narrative || '',
            source: 'External Link',
            direction: 'outgoing',
            isExternal: true,
            isResolved: false
          });
        }
        // Handle internal (resolved) links
        else if (link.activities) {
          relatedActivities.push({
            id: link.activities.id,
            title: link.activities.title_narrative || 'Untitled Activity',
            acronym: link.activities.acronym || '',
            iatiIdentifier: link.activities.iati_identifier || '',
            status: link.activities.activity_status || '',
            organizationName: link.activities.created_by_org_name || '',
            organizationAcronym: link.activities.created_by_org_acronym || '',
            icon: link.activities.icon || '',
            relationshipType: getRelationshipTypeName(link.relationship_type),
            relationshipTypeCode: link.relationship_type, // Raw code for comparison
            relationshipNarrative: link.narrative || '',
            source: 'Linked Activities',
            direction: 'outgoing',
            isExternal: false,
            isResolved: link.is_resolved || false
          });
        }
      });
    }

    // 2. Fetch incoming linked activities (where this activity is the related one)
    const { data: incomingLinks, error: incomingError } = await supabase
      .from('activity_relationships')
      .select(`
        id,
        activity_id,
        relationship_type,
        narrative,
        created_at,
        activities!activity_id (
          id,
          title_narrative,
          acronym,
          iati_identifier,
          activity_status,
          created_by_org_name,
          created_by_org_acronym,
          icon
        )
      `)
      .eq('related_activity_id', activityId);

    if (incomingError) {
      console.error('Error fetching incoming linked activities:', incomingError);
    } else if (incomingLinks) {
      incomingLinks.forEach((link: any) => {
        if (link.activities) {
          relatedActivities.push({
            id: link.activities.id,
            title: link.activities.title_narrative || 'Untitled Activity',
            acronym: link.activities.acronym || '',
            iatiIdentifier: link.activities.iati_identifier || '',
            status: link.activities.activity_status || '',
            organizationName: link.activities.created_by_org_name || '',
            organizationAcronym: link.activities.created_by_org_acronym || '',
            icon: link.activities.icon || '',
            relationshipType: getRelationshipTypeName(link.relationship_type),
            relationshipTypeCode: link.relationship_type, // Raw code for comparison
            relationshipNarrative: link.narrative || '',
            source: 'Linked Activities',
            direction: 'incoming'
          });
        }
      });
    }

    // 3. Fetch provider activities from transactions
    const { data: providerTransactions, error: providerError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        transaction_type,
        transaction_date,
        value,
        currency,
        provider_activity_uuid,
        activities!provider_activity_uuid (
          id,
          title_narrative,
          acronym,
          iati_identifier,
          activity_status,
          created_by_org_name,
          created_by_org_acronym,
          icon
        )
      `)
      .eq('activity_id', activityId)
      .not('provider_activity_uuid', 'is', null);

    if (providerError) {
      console.error('Error fetching provider activities:', providerError);
    } else if (providerTransactions) {
      providerTransactions.forEach((trans: any) => {
        if (trans.activities) {
          // Check if this activity is already in the list
          const existing = relatedActivities.find(a => a.id === trans.activities.id);
          if (existing) {
            // Update source if not already included
            if (!existing.source.includes('Transaction Provider')) {
              existing.source = `${existing.source}, Transaction Provider`;
            }
          } else {
            relatedActivities.push({
              id: trans.activities.id,
              title: trans.activities.title_narrative || 'Untitled Activity',
              acronym: trans.activities.acronym || '',
              iatiIdentifier: trans.activities.iati_identifier || '',
              status: trans.activities.activity_status || '',
              organizationName: trans.activities.created_by_org_name || '',
              organizationAcronym: trans.activities.created_by_org_acronym || '',
              icon: trans.activities.icon || '',
              relationshipType: 'Provider',
              relationshipNarrative: '',
              source: 'Transaction Provider',
              direction: 'incoming'
            });
          }
        }
      });
    }

    // 4. Fetch receiver activities from transactions
    const { data: receiverTransactions, error: receiverError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        transaction_type,
        transaction_date,
        value,
        currency,
        receiver_activity_uuid,
        activities!receiver_activity_uuid (
          id,
          title_narrative,
          acronym,
          iati_identifier,
          activity_status,
          created_by_org_name,
          created_by_org_acronym,
          icon
        )
      `)
      .eq('activity_id', activityId)
      .not('receiver_activity_uuid', 'is', null);

    if (receiverError) {
      console.error('Error fetching receiver activities:', receiverError);
    } else if (receiverTransactions) {
      receiverTransactions.forEach((trans: any) => {
        if (trans.activities) {
          // Check if this activity is already in the list
          const existing = relatedActivities.find(a => a.id === trans.activities.id);
          if (existing) {
            // Update source if not already included
            if (!existing.source.includes('Transaction Receiver')) {
              existing.source = `${existing.source}, Transaction Receiver`;
            }
          } else {
            relatedActivities.push({
              id: trans.activities.id,
              title: trans.activities.title_narrative || 'Untitled Activity',
              acronym: trans.activities.acronym || '',
              iatiIdentifier: trans.activities.iati_identifier || '',
              status: trans.activities.activity_status || '',
              organizationName: trans.activities.created_by_org_name || '',
              organizationAcronym: trans.activities.created_by_org_acronym || '',
              icon: trans.activities.icon || '',
              relationshipType: 'Receiver',
              relationshipNarrative: '',
              source: 'Transaction Receiver',
              direction: 'outgoing'
            });
          }
        }
      });
    }

    // Remove duplicates and return
    const uniqueActivities = Array.from(
      new Map(relatedActivities.map(item => [item.id, item])).values()
    );

    return NextResponse.json(uniqueActivities);
  } catch (error: any) {
    console.error('Error fetching related activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related activities' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      related_activity_id,
      external_iati_identifier,
      external_activity_title,
      relationship_type,
      narrative
    } = body;

    // Validation
    if (!relationship_type) {
      return NextResponse.json(
        { error: 'Relationship type is required' },
        { status: 400 }
      );
    }

    if (!related_activity_id && !external_iati_identifier) {
      return NextResponse.json(
        { error: 'Either related_activity_id or external_iati_identifier is required' },
        { status: 400 }
      );
    }

    // Build the insert data
    const insertData: any = {
      activity_id: activityId,
      relationship_type,
      narrative: narrative || null,
    };

    if (related_activity_id) {
      // Internal link
      insertData.related_activity_id = related_activity_id;
    } else {
      // External link
      insertData.external_iati_identifier = external_iati_identifier;
      insertData.external_activity_title = external_activity_title || null;
      insertData.is_resolved = false;
    }

    const { data, error } = await supabase
      .from('activity_relationships')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating relationship:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /related-activities:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('relationship_id');

    if (!relationshipId) {
      return NextResponse.json(
        { error: 'Relationship ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('activity_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('activity_id', activityId); // Ensure it belongs to this activity

    if (error) {
      console.error('Error deleting relationship:', error);
      return NextResponse.json(
        { error: 'Failed to delete relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /related-activities:', error);
    return NextResponse.json(
      { error: 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}











