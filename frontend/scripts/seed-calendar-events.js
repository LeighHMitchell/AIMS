const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const events = [
  // January 2026
  { title: 'Q1 Planning Session', description: 'Quarterly planning meeting to set goals and priorities for Q1 2026. All department heads required.', start: '2026-01-06T09:00:00Z', end: '2026-01-06T12:00:00Z', location: 'Main Conference Room', type: 'meeting', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['john@example.com', 'emma@example.com', 'david@example.com'] },
  { title: 'Project Kickoff: Atlas Upgrade', description: 'Initial kickoff meeting for the Atlas mapping system upgrade project.', start: '2026-01-08T14:00:00Z', end: '2026-01-08T16:00:00Z', location: 'Room 204', type: 'meeting', status: 'approved', color: '#7c3aed', organizer_id: '00000000-0000-0000-0000-000000000002', organizer_name: 'James Chen', attendees: ['tech-team@example.com'] },
  { title: 'Grant Proposal Deadline', description: 'Final submission deadline for the Environmental Sustainability Grant application.', start: '2026-01-15T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: [] },
  { title: 'Data Management Workshop', description: 'Hands-on workshop covering best practices for IATI data management and reporting.', start: '2026-01-20T10:00:00Z', end: '2026-01-20T16:00:00Z', location: 'Training Center', type: 'workshop', status: 'approved', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000003', organizer_name: 'Emily Watson', attendees: ['new-staff@example.com'] },
  { title: 'Monthly Team Standup', description: 'Regular monthly all-hands meeting to discuss progress and blockers.', start: '2026-01-28T09:30:00Z', end: '2026-01-28T10:30:00Z', location: 'Virtual - Zoom', type: 'meeting', status: 'approved', color: '#0891b2', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['all-staff@example.com'] },

  // February 2026
  { title: 'Annual Donor Conference', description: 'Two-day conference bringing together all major donors and stakeholders.', start: '2026-02-03T09:00:00Z', end: '2026-02-04T17:00:00Z', location: 'Grand Hotel Convention Center', type: 'conference', status: 'approved', color: '#7c3aed', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: ['donors@example.com', 'board@example.com'] },
  { title: 'Budget Review Meeting', description: 'Mid-year budget review with finance team.', start: '2026-02-10T14:00:00Z', end: '2026-02-10T16:00:00Z', location: 'Finance Office', type: 'meeting', status: 'approved', color: '#ea580c', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: ['finance-team@example.com'] },
  { title: 'Valentines Day Charity Gala', description: 'Annual fundraising gala supporting education initiatives.', start: '2026-02-14T18:00:00Z', end: '2026-02-14T23:00:00Z', location: 'City Arts Center', type: 'other', status: 'approved', color: '#db2777', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: ['vip-guests@example.com'] },
  { title: 'Technical Training: New CRM System', description: 'Training session on the newly implemented CRM system.', start: '2026-02-18T09:00:00Z', end: '2026-02-18T13:00:00Z', location: 'IT Lab', type: 'workshop', status: 'approved', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000002', organizer_name: 'James Chen', attendees: ['admin-staff@example.com'] },
  { title: 'Monthly Report Deadline', description: 'Deadline for submitting monthly progress reports to headquarters.', start: '2026-02-28T23:59:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: [] },
  { title: 'New Project Proposal Review', description: 'Review meeting for new project proposals submitted by field teams.', start: '2026-02-25T14:00:00Z', end: '2026-02-25T16:00:00Z', location: 'Room 302', type: 'meeting', status: 'pending', color: '#7b95a7', organizer_id: '00000000-0000-0000-0000-000000000009', organizer_name: 'Tom Anderson', attendees: ['project-team@example.com'] },

  // March 2026
  { title: 'Spring Community Outreach', description: 'Community engagement event in partnership with local organizations.', start: '2026-03-05T10:00:00Z', end: '2026-03-05T15:00:00Z', location: 'Community Center', type: 'other', status: 'approved', color: '#ca8a04', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['volunteers@example.com'] },
  { title: 'Board of Directors Meeting', description: 'Quarterly board meeting to review organizational performance.', start: '2026-03-12T10:00:00Z', end: '2026-03-12T14:00:00Z', location: 'Executive Boardroom', type: 'meeting', status: 'approved', color: '#4c5568', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['board@example.com'] },
  { title: 'International Development Summit', description: 'Three-day summit on sustainable development practices.', start: '2026-03-16T08:00:00Z', end: '2026-03-18T18:00:00Z', location: 'International Conference Center', type: 'conference', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: ['delegates@example.com'] },
  { title: 'IATI Compliance Workshop', description: 'Workshop on maintaining IATI standard compliance for all projects.', start: '2026-03-24T09:00:00Z', end: '2026-03-24T17:00:00Z', location: 'Training Room B', type: 'workshop', status: 'approved', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000003', organizer_name: 'Emily Watson', attendees: ['project-managers@example.com'] },
  { title: 'Volunteer Training Session', description: 'Training session for new community volunteers.', start: '2026-03-28T09:00:00Z', end: '2026-03-28T12:00:00Z', location: 'Training Center', type: 'workshop', status: 'pending', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['volunteers@example.com'] },
  { title: 'Q1 Financial Close', description: 'Deadline for Q1 financial reporting and reconciliation.', start: '2026-03-31T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: [] },

  // April 2026
  { title: 'Q2 Planning Session', description: 'Quarterly planning meeting to set goals and priorities for Q2 2026.', start: '2026-04-02T09:00:00Z', end: '2026-04-02T12:00:00Z', location: 'Main Conference Room', type: 'meeting', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['department-heads@example.com'] },
  { title: 'Partner Organization Summit', description: 'Annual summit with all partner organizations.', start: '2026-04-14T09:00:00Z', end: '2026-04-15T17:00:00Z', location: 'Riverside Convention Center', type: 'conference', status: 'approved', color: '#7b95a7', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: ['partners@example.com'] },
  { title: 'New Staff Orientation', description: 'Orientation session for newly hired staff members.', start: '2026-04-20T09:00:00Z', end: '2026-04-20T17:00:00Z', location: 'HR Training Room', type: 'workshop', status: 'approved', color: '#0891b2', organizer_id: '00000000-0000-0000-0000-000000000007', organizer_name: 'Karen Thompson', attendees: ['new-hires@example.com'] },
  { title: 'Earth Day Sustainability Fair', description: 'Community event promoting environmental sustainability.', start: '2026-04-22T10:00:00Z', end: '2026-04-22T16:00:00Z', location: 'Central Park Pavilion', type: 'other', status: 'approved', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['community@example.com'] },
  { title: 'Monitoring & Evaluation Training', description: 'Comprehensive M&E training for field officers.', start: '2026-04-27T09:00:00Z', end: '2026-04-28T17:00:00Z', location: 'Training Center', type: 'workshop', status: 'approved', color: '#ea580c', organizer_id: '00000000-0000-0000-0000-000000000003', organizer_name: 'Emily Watson', attendees: ['field-officers@example.com'] },
  { title: 'Impact Assessment Deadline', description: 'Deadline for submitting impact assessment reports.', start: '2026-04-30T17:00:00Z', end: null, location: null, type: 'deadline', status: 'pending', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000003', organizer_name: 'Emily Watson', attendees: [] },

  // May 2026
  { title: 'Annual Audit Kickoff', description: 'Initial meeting with external auditors for annual audit.', start: '2026-05-04T10:00:00Z', end: '2026-05-04T12:00:00Z', location: 'Finance Office', type: 'meeting', status: 'approved', color: '#4c5568', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: ['auditors@external.com', 'finance-team@example.com'] },
  { title: 'Regional Coordinators Meeting', description: 'Quarterly meeting with all regional coordinators.', start: '2026-05-11T09:00:00Z', end: '2026-05-11T16:00:00Z', location: 'Main Conference Room', type: 'meeting', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['regional-coords@example.com'] },
  { title: 'Grant Application Deadline', description: 'Deadline for Climate Action Fund grant application.', start: '2026-05-15T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: [] },
  { title: 'Technology Innovation Workshop', description: 'Workshop exploring new technologies for development work.', start: '2026-05-19T10:00:00Z', end: '2026-05-19T16:00:00Z', location: 'Innovation Lab', type: 'workshop', status: 'approved', color: '#7c3aed', organizer_id: '00000000-0000-0000-0000-000000000002', organizer_name: 'James Chen', attendees: ['tech-team@example.com'] },
  { title: 'Monthly Team Standup', description: 'Regular monthly all-hands meeting.', start: '2026-05-26T09:30:00Z', end: '2026-05-26T10:30:00Z', location: 'Virtual - Zoom', type: 'meeting', status: 'approved', color: '#0891b2', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['all-staff@example.com'] },

  // June 2026
  { title: 'Mid-Year Review Conference', description: 'Organization-wide mid-year performance review.', start: '2026-06-08T09:00:00Z', end: '2026-06-09T17:00:00Z', location: 'Grand Hotel Convention Center', type: 'conference', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['all-staff@example.com'] },
  { title: 'Board of Directors Meeting', description: 'Quarterly board meeting.', start: '2026-06-15T10:00:00Z', end: '2026-06-15T14:00:00Z', location: 'Executive Boardroom', type: 'meeting', status: 'approved', color: '#4c5568', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['board@example.com'] },
  { title: 'Summer Internship Program Kickoff', description: 'Orientation for summer interns.', start: '2026-06-22T09:00:00Z', end: '2026-06-22T17:00:00Z', location: 'Training Center', type: 'other', status: 'approved', color: '#ca8a04', organizer_id: '00000000-0000-0000-0000-000000000007', organizer_name: 'Karen Thompson', attendees: ['interns@example.com'] },
  { title: 'Q2 Financial Close', description: 'Deadline for Q2 financial reporting.', start: '2026-06-30T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: [] },

  // July 2026
  { title: 'Q3 Planning Session', description: 'Quarterly planning meeting for Q3 2026.', start: '2026-07-02T09:00:00Z', end: '2026-07-02T12:00:00Z', location: 'Main Conference Room', type: 'meeting', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['department-heads@example.com'] },
  { title: 'Data Analytics Training', description: 'Advanced training on data analytics and visualization.', start: '2026-07-08T09:00:00Z', end: '2026-07-09T17:00:00Z', location: 'IT Lab', type: 'workshop', status: 'approved', color: '#7c3aed', organizer_id: '00000000-0000-0000-0000-000000000002', organizer_name: 'James Chen', attendees: ['analysts@example.com'] },
  { title: 'Community Health Initiative Launch', description: 'Launch event for new community health program.', start: '2026-07-15T10:00:00Z', end: '2026-07-15T14:00:00Z', location: 'Community Health Center', type: 'other', status: 'approved', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['health-team@example.com', 'community@example.com'] },
  { title: 'Annual Audit Completion', description: 'Deadline for completing annual audit process.', start: '2026-07-31T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: [] },

  // August 2026
  { title: 'Strategic Planning Retreat', description: 'Two-day retreat for strategic planning 2027-2029.', start: '2026-08-10T09:00:00Z', end: '2026-08-11T17:00:00Z', location: 'Mountain View Resort', type: 'meeting', status: 'approved', color: '#7b95a7', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['leadership-team@example.com'] },
  { title: 'Youth Empowerment Workshop', description: 'Workshop series for youth development program.', start: '2026-08-17T09:00:00Z', end: '2026-08-17T16:00:00Z', location: 'Youth Center', type: 'workshop', status: 'approved', color: '#ea580c', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['youth-program@example.com'] },
  { title: 'Technology Systems Review', description: 'Comprehensive review of all technology systems.', start: '2026-08-24T10:00:00Z', end: '2026-08-24T16:00:00Z', location: 'IT Department', type: 'meeting', status: 'approved', color: '#0891b2', organizer_id: '00000000-0000-0000-0000-000000000002', organizer_name: 'James Chen', attendees: ['tech-team@example.com', 'department-heads@example.com'] },
  { title: 'Monthly Report Deadline', description: 'Monthly progress report submission.', start: '2026-08-31T23:59:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: [] },

  // September 2026
  { title: 'Back to School Community Event', description: 'Community event supporting local school programs.', start: '2026-09-07T10:00:00Z', end: '2026-09-07T15:00:00Z', location: 'Central Community Park', type: 'other', status: 'approved', color: '#ca8a04', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['volunteers@example.com', 'community@example.com'] },
  { title: 'Board of Directors Meeting', description: 'Quarterly board meeting.', start: '2026-09-14T10:00:00Z', end: '2026-09-14T14:00:00Z', location: 'Executive Boardroom', type: 'meeting', status: 'approved', color: '#4c5568', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['board@example.com'] },
  { title: 'International Aid Conference', description: 'Major international conference on humanitarian aid.', start: '2026-09-21T08:00:00Z', end: '2026-09-23T18:00:00Z', location: 'International Conference Center', type: 'conference', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: ['international-delegates@example.com'] },
  { title: 'Q3 Financial Close', description: 'Deadline for Q3 financial reporting.', start: '2026-09-30T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: [] },

  // October 2026
  { title: 'Q4 Planning Session', description: 'Quarterly planning meeting for Q4 2026.', start: '2026-10-01T09:00:00Z', end: '2026-10-01T12:00:00Z', location: 'Main Conference Room', type: 'meeting', status: 'approved', color: '#2563eb', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['department-heads@example.com'] },
  { title: 'Cybersecurity Awareness Workshop', description: 'Workshop on cybersecurity best practices.', start: '2026-10-12T09:00:00Z', end: '2026-10-12T13:00:00Z', location: 'IT Lab', type: 'workshop', status: 'approved', color: '#7c3aed', organizer_id: '00000000-0000-0000-0000-000000000002', organizer_name: 'James Chen', attendees: ['all-staff@example.com'] },
  { title: 'Annual Fundraising Gala', description: 'Major annual fundraising event.', start: '2026-10-17T18:00:00Z', end: '2026-10-17T23:00:00Z', location: 'Grand Ballroom Hotel', type: 'other', status: 'approved', color: '#db2777', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: ['donors@example.com', 'vip-guests@example.com'] },
  { title: 'Regional Coordinators Meeting', description: 'Quarterly meeting with regional coordinators.', start: '2026-10-26T09:00:00Z', end: '2026-10-26T16:00:00Z', location: 'Main Conference Room', type: 'meeting', status: 'approved', color: '#0891b2', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['regional-coords@example.com'] },

  // November 2026
  { title: 'Annual Report Preparation Meeting', description: 'Kickoff meeting for annual report preparation.', start: '2026-11-02T10:00:00Z', end: '2026-11-02T12:00:00Z', location: 'Communications Office', type: 'meeting', status: 'approved', color: '#ea580c', organizer_id: '00000000-0000-0000-0000-000000000008', organizer_name: 'David Wilson', attendees: ['communications@example.com', 'department-heads@example.com'] },
  { title: 'Year-End Budget Review', description: 'Comprehensive year-end budget review.', start: '2026-11-16T09:00:00Z', end: '2026-11-16T17:00:00Z', location: 'Finance Office', type: 'meeting', status: 'approved', color: '#4c5568', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: ['finance-team@example.com', 'department-heads@example.com'] },
  { title: 'Thanksgiving Community Service', description: 'Community service event for Thanksgiving.', start: '2026-11-25T09:00:00Z', end: '2026-11-25T14:00:00Z', location: 'Local Food Bank', type: 'other', status: 'approved', color: '#ca8a04', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['volunteers@example.com'] },
  { title: 'Grant Report Deadline', description: 'Deadline for major grant progress reports.', start: '2026-11-30T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000004', organizer_name: 'Michael Brown', attendees: [] },

  // December 2026
  { title: 'Board of Directors Meeting', description: 'Final quarterly board meeting of the year.', start: '2026-12-07T10:00:00Z', end: '2026-12-07T14:00:00Z', location: 'Executive Boardroom', type: 'meeting', status: 'approved', color: '#4c5568', organizer_id: '00000000-0000-0000-0000-000000000001', organizer_name: 'Sarah Mitchell', attendees: ['board@example.com'] },
  { title: 'Annual Staff Appreciation Event', description: 'Year-end celebration for all staff members.', start: '2026-12-11T17:00:00Z', end: '2026-12-11T21:00:00Z', location: 'Riverside Restaurant', type: 'other', status: 'approved', color: '#db2777', organizer_id: '00000000-0000-0000-0000-000000000007', organizer_name: 'Karen Thompson', attendees: ['all-staff@example.com'] },
  { title: 'Holiday Charity Drive', description: 'Annual holiday charity drive for local families.', start: '2026-12-18T10:00:00Z', end: '2026-12-18T16:00:00Z', location: 'Community Center', type: 'other', status: 'approved', color: '#16a34a', organizer_id: '00000000-0000-0000-0000-000000000006', organizer_name: 'Anna Rodriguez', attendees: ['volunteers@example.com', 'community@example.com'] },
  { title: 'Q4 Financial Close', description: 'Year-end financial close deadline.', start: '2026-12-31T17:00:00Z', end: null, location: null, type: 'deadline', status: 'approved', color: '#dc2625', organizer_id: '00000000-0000-0000-0000-000000000005', organizer_name: 'Lisa Park', attendees: [] },
];

async function seedEvents() {
  console.log('Starting to seed calendar events...');

  // First, add the color column if it doesn't exist
  console.log('Ensuring color column exists...');

  let successCount = 0;
  let errorCount = 0;

  for (const event of events) {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(event)
      .select();

    if (error) {
      console.error(`Failed to insert "${event.title}":`, error.message);
      errorCount++;
    } else {
      console.log(`Inserted: ${event.title}`);
      successCount++;
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`Successfully inserted: ${successCount} events`);
  console.log(`Failed: ${errorCount} events`);
}

seedEvents().catch(console.error);
