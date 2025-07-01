-- Create working_groups table for storing technical/sector working groups
CREATE TABLE IF NOT EXISTS working_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  sector_code VARCHAR(10),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create activity_working_groups join table
CREATE TABLE IF NOT EXISTS activity_working_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  working_group_id UUID NOT NULL REFERENCES working_groups(id) ON DELETE CASCADE,
  vocabulary VARCHAR(10) DEFAULT '99', -- IATI vocabulary code for custom
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(activity_id, working_group_id)
);

-- Create indexes for activity_working_groups
CREATE INDEX IF NOT EXISTS idx_activity_working_groups_activity_id ON activity_working_groups(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_working_groups_working_group_id ON activity_working_groups(working_group_id);

-- Insert predefined working groups
INSERT INTO working_groups (code, label, sector_code, description) VALUES
-- Health Sector
('TWG-Health', 'Health Technical Working Group', '12220', 'Coordinates health sector activities and policies'),
('SWG-HealthFinancing', 'Health Financing Sub-Working Group', '12220', 'Focuses on sustainable health financing mechanisms'),
('SWG-ReproductiveHealth', 'Reproductive Health Sub-Working Group', '13020', 'Coordinates reproductive health programs'),

-- Education Sector
('TWG-Education', 'Education Technical Working Group', '11110', 'Oversees education sector development'),
('SWG-BasicEducation', 'Basic Education Sub-Working Group', '11220', 'Focuses on primary and secondary education'),
('SWG-TechVocational', 'Technical & Vocational Education Sub-Working Group', '11330', 'Coordinates TVET programs'),

-- Gender
('TWG-Gender', 'Gender Equality Technical Working Group', '15170', 'Mainstreams gender across all sectors'),

-- Agriculture & Rural Development
('TWG-Agriculture', 'Agriculture & Rural Development TWG', '31110', 'Coordinates agricultural development initiatives'),
('SWG-FoodSecurity', 'Food Security Sub-Working Group', '31120', 'Addresses food security and nutrition'),

-- Water & Sanitation
('TWG-WASH', 'Water, Sanitation & Hygiene TWG', '14010', 'Coordinates WASH sector activities'),

-- Economic Development
('TWG-PrivateSector', 'Private Sector Development TWG', '25010', 'Promotes private sector growth'),
('TWG-Trade', 'Trade & Investment TWG', '33110', 'Facilitates trade and investment'),

-- Governance
('TWG-Governance', 'Good Governance TWG', '15110', 'Strengthens governance and public administration'),
('SWG-Decentralization', 'Decentralization Sub-Working Group', '15112', 'Supports local governance'),

-- Infrastructure
('TWG-Infrastructure', 'Infrastructure Development TWG', '21010', 'Coordinates infrastructure development'),

-- Environment & Climate
('TWG-Environment', 'Environment & Climate Change TWG', '41010', 'Addresses environmental and climate issues'),

-- Social Protection
('TWG-SocialProtection', 'Social Protection TWG', '16010', 'Coordinates social safety net programs'),

-- Cross-cutting
('TWG-M&E', 'Monitoring & Evaluation TWG', NULL, 'Oversees M&E frameworks and practices'),
('TWG-Coordination', 'Development Partner Coordination TWG', NULL, 'Facilitates donor coordination')
ON CONFLICT (code) DO NOTHING; 