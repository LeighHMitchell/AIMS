import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/users/export-data - Starting request');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    // Get user ID from query params
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        organizations:organization_id (
          id,
          name,
          acronym,
          type,
          country
        )
      `)
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('[AIMS] Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch activities where user is a focal point or contact
    const { data: activityContacts, error: contactsError } = await supabase
      .from('activity_contacts')
      .select(`
        id,
        is_focal_point,
        has_editing_rights,
        role,
        activities:activity_id (
          id,
          title,
          iati_identifier,
          activity_status
        )
      `)
      .eq('linked_user_id', userId);

    if (contactsError) {
      console.error('[AIMS] Error fetching activity contacts:', contactsError);
    }

    // Fetch organization comments made by user
    const { data: orgComments, error: commentsError } = await supabase
      .from('organization_comments')
      .select(`
        id,
        comment,
        created_at,
        organizations:organization_id (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (commentsError) {
      console.error('[AIMS] Error fetching organization comments:', commentsError);
    }

    // Fetch activity bookmarks
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('activity_bookmarks')
      .select(`
        id,
        created_at,
        activities:activity_id (
          id,
          title,
          iati_identifier
        )
      `)
      .eq('user_id', userId);

    if (bookmarksError) {
      console.error('[AIMS] Error fetching bookmarks:', bookmarksError);
    }

    // Fetch user feedback submissions
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId);

    if (feedbackError) {
      console.error('[AIMS] Error fetching feedback:', feedbackError);
    }

    // Fetch FAQ questions submitted by user
    const { data: faqQuestions, error: faqError } = await supabase
      .from('faq_questions')
      .select('*')
      .eq('user_id', userId);

    if (faqError) {
      console.error('[AIMS] Error fetching FAQ questions:', faqError);
    }

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportedBy: userData.email,
      
      personalInfo: {
        id: userData.id,
        email: userData.email,
        title: userData.title,
        firstName: userData.first_name,
        middleName: userData.middle_name,
        lastName: userData.last_name,
        suffix: userData.suffix,
        name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        gender: userData.gender,
        role: userData.role,
        jobTitle: userData.job_title,
        department: userData.department,
        organisation: userData.organisation,
        organization: userData.organizations,
        telephone: userData.telephone,
        faxNumber: userData.fax_number,
        website: userData.website,
        mailingAddress: userData.mailing_address,
        addressLine1: userData.address_line_1,
        addressLine2: userData.address_line_2,
        city: userData.city,
        stateProvince: userData.state_province,
        country: userData.country,
        postalCode: userData.postal_code,
        bio: userData.bio,
        preferredLanguage: userData.preferred_language,
        timezone: userData.timezone,
        contactType: userData.contact_type,
        notes: userData.notes,
        isActive: userData.is_active,
        authProvider: userData.auth_provider,
        lastLogin: userData.last_login,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      },
      
      activityInvolvement: activityContacts?.map(contact => ({
        activityId: contact.activities?.id,
        activityTitle: contact.activities?.title,
        iatiIdentifier: contact.activities?.iati_identifier,
        activityStatus: contact.activities?.activity_status,
        isFocalPoint: contact.is_focal_point,
        hasEditingRights: contact.has_editing_rights,
        role: contact.role,
      })) || [],
      
      organizationComments: orgComments?.map(comment => ({
        id: comment.id,
        organizationId: comment.organizations?.id,
        organizationName: comment.organizations?.name,
        comment: comment.comment,
        createdAt: comment.created_at,
      })) || [],
      
      bookmarkedActivities: bookmarks?.map(bookmark => ({
        activityId: bookmark.activities?.id,
        activityTitle: bookmark.activities?.title,
        iatiIdentifier: bookmark.activities?.iati_identifier,
        bookmarkedAt: bookmark.created_at,
      })) || [],
      
      feedbackSubmissions: feedback?.map(item => ({
        id: item.id,
        category: item.category,
        subject: item.subject,
        message: item.message,
        status: item.status,
        createdAt: item.created_at,
      })) || [],
      
      faqQuestions: faqQuestions?.map(question => ({
        id: question.id,
        question: question.question,
        status: question.status,
        createdAt: question.created_at,
      })) || [],
    };

    console.log('[AIMS] Successfully compiled export data for user:', userId);

    // Return as downloadable JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `aims-data-export-${userData.email.replace('@', '_at_')}-${new Date().toISOString().split('T')[0]}.json`;
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}

