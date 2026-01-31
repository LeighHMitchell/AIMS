-- Seed calendar events throughout 2026
-- Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum

INSERT INTO calendar_events (title, description, start, "end", location, type, status, color, organizer_id, organizer_name, attendees) VALUES

-- January 2026
('Q1 Planning Session', 'Quarterly planning meeting to set goals and priorities for Q1 2026. All department heads required.', '2026-01-06 09:00:00+00', '2026-01-06 12:00:00+00', 'Main Conference Room', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['john@example.com', 'emma@example.com', 'david@example.com']),
('Project Kickoff: Atlas Upgrade', 'Initial kickoff meeting for the Atlas mapping system upgrade project.', '2026-01-08 14:00:00+00', '2026-01-08 16:00:00+00', 'Room 204', 'meeting', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000002', 'James Chen', ARRAY['tech-team@example.com']),
('Grant Proposal Deadline', 'Final submission deadline for the Environmental Sustainability Grant application.', '2026-01-15 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY[]::text[]),
('Data Management Workshop', 'Hands-on workshop covering best practices for IATI data management and reporting.', '2026-01-20 10:00:00+00', '2026-01-20 16:00:00+00', 'Training Center', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000003', 'Emily Watson', ARRAY['new-staff@example.com']),
('Monthly Team Standup', 'Regular monthly all-hands meeting to discuss progress and blockers.', '2026-01-28 09:30:00+00', '2026-01-28 10:30:00+00', 'Virtual - Zoom', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['all-staff@example.com']),

-- February 2026
('Annual Donor Conference', 'Two-day conference bringing together all major donors and stakeholders.', '2026-02-03 09:00:00+00', '2026-02-04 17:00:00+00', 'Grand Hotel Convention Center', 'conference', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY['donors@example.com', 'board@example.com']),
('Budget Review Meeting', 'Mid-year budget review with finance team.', '2026-02-10 14:00:00+00', '2026-02-10 16:00:00+00', 'Finance Office', 'meeting', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY['finance-team@example.com']),
('Valentines Day Charity Gala', 'Annual fundraising gala supporting education initiatives.', '2026-02-14 18:00:00+00', '2026-02-14 23:00:00+00', 'City Arts Center', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY['vip-guests@example.com']),
('Technical Training: New CRM System', 'Training session on the newly implemented CRM system.', '2026-02-18 09:00:00+00', '2026-02-18 13:00:00+00', 'IT Lab', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000002', 'James Chen', ARRAY['admin-staff@example.com']),
('Monthly Report Deadline', 'Deadline for submitting monthly progress reports to headquarters.', '2026-02-28 23:59:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY[]::text[]),

-- March 2026
('Spring Community Outreach', 'Community engagement event in partnership with local organizations.', '2026-03-05 10:00:00+00', '2026-03-05 15:00:00+00', 'Community Center', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['volunteers@example.com']),
('Board of Directors Meeting', 'Quarterly board meeting to review organizational performance.', '2026-03-12 10:00:00+00', '2026-03-12 14:00:00+00', 'Executive Boardroom', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['board@example.com']),
('International Development Summit', 'Three-day summit on sustainable development practices.', '2026-03-16 08:00:00+00', '2026-03-18 18:00:00+00', 'International Conference Center', 'conference', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY['delegates@example.com']),
('IATI Compliance Workshop', 'Workshop on maintaining IATI standard compliance for all projects.', '2026-03-24 09:00:00+00', '2026-03-24 17:00:00+00', 'Training Room B', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000003', 'Emily Watson', ARRAY['project-managers@example.com']),
('Q1 Financial Close', 'Deadline for Q1 financial reporting and reconciliation.', '2026-03-31 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY[]::text[]),

-- April 2026
('Q2 Planning Session', 'Quarterly planning meeting to set goals and priorities for Q2 2026.', '2026-04-02 09:00:00+00', '2026-04-02 12:00:00+00', 'Main Conference Room', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['department-heads@example.com']),
('Earth Day Sustainability Fair', 'Community event promoting environmental sustainability.', '2026-04-22 10:00:00+00', '2026-04-22 16:00:00+00', 'Central Park Pavilion', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['community@example.com']),
('Partner Organization Summit', 'Annual summit with all partner organizations.', '2026-04-14 09:00:00+00', '2026-04-15 17:00:00+00', 'Riverside Convention Center', 'conference', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY['partners@example.com']),
('New Staff Orientation', 'Orientation session for newly hired staff members.', '2026-04-20 09:00:00+00', '2026-04-20 17:00:00+00', 'HR Training Room', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000007', 'Karen Thompson', ARRAY['new-hires@example.com']),
('Monitoring & Evaluation Training', 'Comprehensive M&E training for field officers.', '2026-04-27 09:00:00+00', '2026-04-28 17:00:00+00', 'Training Center', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000003', 'Emily Watson', ARRAY['field-officers@example.com']),

-- May 2026
('Annual Audit Kickoff', 'Initial meeting with external auditors for annual audit.', '2026-05-04 10:00:00+00', '2026-05-04 12:00:00+00', 'Finance Office', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY['auditors@external.com', 'finance-team@example.com']),
('Regional Coordinators Meeting', 'Quarterly meeting with all regional coordinators.', '2026-05-11 09:00:00+00', '2026-05-11 16:00:00+00', 'Main Conference Room', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['regional-coords@example.com']),
('Grant Application Deadline', 'Deadline for Climate Action Fund grant application.', '2026-05-15 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY[]::text[]),
('Technology Innovation Workshop', 'Workshop exploring new technologies for development work.', '2026-05-19 10:00:00+00', '2026-05-19 16:00:00+00', 'Innovation Lab', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000002', 'James Chen', ARRAY['tech-team@example.com']),
('Monthly Team Standup', 'Regular monthly all-hands meeting.', '2026-05-26 09:30:00+00', '2026-05-26 10:30:00+00', 'Virtual - Zoom', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['all-staff@example.com']),

-- June 2026
('Mid-Year Review Conference', 'Organization-wide mid-year performance review.', '2026-06-08 09:00:00+00', '2026-06-09 17:00:00+00', 'Grand Hotel Convention Center', 'conference', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['all-staff@example.com']),
('Board of Directors Meeting', 'Quarterly board meeting.', '2026-06-15 10:00:00+00', '2026-06-15 14:00:00+00', 'Executive Boardroom', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['board@example.com']),
('Summer Internship Program Kickoff', 'Orientation for summer interns.', '2026-06-22 09:00:00+00', '2026-06-22 17:00:00+00', 'Training Center', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000007', 'Karen Thompson', ARRAY['interns@example.com']),
('Q2 Financial Close', 'Deadline for Q2 financial reporting.', '2026-06-30 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY[]::text[]),

-- July 2026
('Q3 Planning Session', 'Quarterly planning meeting for Q3 2026.', '2026-07-02 09:00:00+00', '2026-07-02 12:00:00+00', 'Main Conference Room', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['department-heads@example.com']),
('Data Analytics Training', 'Advanced training on data analytics and visualization.', '2026-07-08 09:00:00+00', '2026-07-09 17:00:00+00', 'IT Lab', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000002', 'James Chen', ARRAY['analysts@example.com']),
('Community Health Initiative Launch', 'Launch event for new community health program.', '2026-07-15 10:00:00+00', '2026-07-15 14:00:00+00', 'Community Health Center', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['health-team@example.com', 'community@example.com']),
('Annual Audit Completion', 'Deadline for completing annual audit process.', '2026-07-31 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY[]::text[]),

-- August 2026
('Strategic Planning Retreat', 'Two-day retreat for strategic planning 2027-2029.', '2026-08-10 09:00:00+00', '2026-08-11 17:00:00+00', 'Mountain View Resort', 'meeting', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['leadership-team@example.com']),
('Youth Empowerment Workshop', 'Workshop series for youth development program.', '2026-08-17 09:00:00+00', '2026-08-17 16:00:00+00', 'Youth Center', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['youth-program@example.com']),
('Technology Systems Review', 'Comprehensive review of all technology systems.', '2026-08-24 10:00:00+00', '2026-08-24 16:00:00+00', 'IT Department', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000002', 'James Chen', ARRAY['tech-team@example.com', 'department-heads@example.com']),
('Monthly Report Deadline', 'Monthly progress report submission.', '2026-08-31 23:59:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY[]::text[]),

-- September 2026
('Back to School Community Event', 'Community event supporting local school programs.', '2026-09-07 10:00:00+00', '2026-09-07 15:00:00+00', 'Central Community Park', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['volunteers@example.com', 'community@example.com']),
('Board of Directors Meeting', 'Quarterly board meeting.', '2026-09-14 10:00:00+00', '2026-09-14 14:00:00+00', 'Executive Boardroom', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['board@example.com']),
('International Aid Conference', 'Major international conference on humanitarian aid.', '2026-09-21 08:00:00+00', '2026-09-23 18:00:00+00', 'International Conference Center', 'conference', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY['international-delegates@example.com']),
('Q3 Financial Close', 'Deadline for Q3 financial reporting.', '2026-09-30 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY[]::text[]),

-- October 2026
('Q4 Planning Session', 'Quarterly planning meeting for Q4 2026.', '2026-10-01 09:00:00+00', '2026-10-01 12:00:00+00', 'Main Conference Room', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['department-heads@example.com']),
('Cybersecurity Awareness Workshop', 'Workshop on cybersecurity best practices.', '2026-10-12 09:00:00+00', '2026-10-12 13:00:00+00', 'IT Lab', 'workshop', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000002', 'James Chen', ARRAY['all-staff@example.com']),
('Annual Fundraising Gala', 'Major annual fundraising event.', '2026-10-17 18:00:00+00', '2026-10-17 23:00:00+00', 'Grand Ballroom Hotel', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY['donors@example.com', 'vip-guests@example.com']),
('Regional Coordinators Meeting', 'Quarterly meeting with regional coordinators.', '2026-10-26 09:00:00+00', '2026-10-26 16:00:00+00', 'Main Conference Room', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['regional-coords@example.com']),

-- November 2026
('Annual Report Preparation Meeting', 'Kickoff meeting for annual report preparation.', '2026-11-02 10:00:00+00', '2026-11-02 12:00:00+00', 'Communications Office', 'meeting', 'approved', '#7b95a7', '00000000-0000-0000-0000-000000000008', 'David Wilson', ARRAY['communications@example.com', 'department-heads@example.com']),
('Thanksgiving Community Service', 'Community service event for Thanksgiving.', '2026-11-25 09:00:00+00', '2026-11-25 14:00:00+00', 'Local Food Bank', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['volunteers@example.com']),
('Year-End Budget Review', 'Comprehensive year-end budget review.', '2026-11-16 09:00:00+00', '2026-11-16 17:00:00+00', 'Finance Office', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY['finance-team@example.com', 'department-heads@example.com']),
('Grant Report Deadline', 'Deadline for major grant progress reports.', '2026-11-30 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000004', 'Michael Brown', ARRAY[]::text[]),

-- December 2026
('Board of Directors Meeting', 'Final quarterly board meeting of the year.', '2026-12-07 10:00:00+00', '2026-12-07 14:00:00+00', 'Executive Boardroom', 'meeting', 'approved', '#4c5568', '00000000-0000-0000-0000-000000000001', 'Sarah Mitchell', ARRAY['board@example.com']),
('Annual Staff Appreciation Event', 'Year-end celebration for all staff members.', '2026-12-11 17:00:00+00', '2026-12-11 21:00:00+00', 'Riverside Restaurant', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000007', 'Karen Thompson', ARRAY['all-staff@example.com']),
('Holiday Charity Drive', 'Annual holiday charity drive for local families.', '2026-12-18 10:00:00+00', '2026-12-18 16:00:00+00', 'Community Center', 'other', 'approved', '#cfd0d5', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['volunteers@example.com', 'community@example.com']),
('Q4 Financial Close', 'Year-end financial close deadline.', '2026-12-31 17:00:00+00', NULL, NULL, 'deadline', 'approved', '#dc2625', '00000000-0000-0000-0000-000000000005', 'Lisa Park', ARRAY[]::text[]),

-- Add some pending events for testing
('New Project Proposal Review', 'Review meeting for new project proposals submitted by field teams.', '2026-02-25 14:00:00+00', '2026-02-25 16:00:00+00', 'Room 302', 'meeting', 'pending', '#7b95a7', '00000000-0000-0000-0000-000000000009', 'Tom Anderson', ARRAY['project-team@example.com']),
('Volunteer Training Session', 'Training session for new community volunteers.', '2026-03-28 09:00:00+00', '2026-03-28 12:00:00+00', 'Training Center', 'workshop', 'pending', '#7b95a7', '00000000-0000-0000-0000-000000000006', 'Anna Rodriguez', ARRAY['volunteers@example.com']),
('Impact Assessment Deadline', 'Deadline for submitting impact assessment reports.', '2026-04-30 17:00:00+00', NULL, NULL, 'deadline', 'pending', '#dc2625', '00000000-0000-0000-0000-000000000003', 'Emily Watson', ARRAY[]::text[]);
