-- Create SDG Goals reference table
CREATE TABLE IF NOT EXISTS sdg_goals (
  id INTEGER PRIMARY KEY, -- 1 to 17
  goal_name TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  icon_url TEXT, -- link to official SDG icon
  color_hex TEXT -- for UI theming (optional)
);

-- Insert SDG Goals data
INSERT INTO sdg_goals (id, goal_name, goal_description, color_hex) VALUES
(1, 'No Poverty', 'End poverty in all its forms everywhere', '#E5243B'),
(2, 'Zero Hunger', 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture', '#DDA63A'),
(3, 'Good Health and Well-being', 'Ensure healthy lives and promote well-being for all at all ages', '#4C9F38'),
(4, 'Quality Education', 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all', '#C5192D'),
(5, 'Gender Equality', 'Achieve gender equality and empower all women and girls', '#FF3A21'),
(6, 'Clean Water and Sanitation', 'Ensure availability and sustainable management of water and sanitation for all', '#26BDE2'),
(7, 'Affordable and Clean Energy', 'Ensure access to affordable, reliable, sustainable and modern energy for all', '#FCC30B'),
(8, 'Decent Work and Economic Growth', 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all', '#A21942'),
(9, 'Industry, Innovation and Infrastructure', 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation', '#FD6925'),
(10, 'Reduced Inequalities', 'Reduce inequality within and among countries', '#DD1367'),
(11, 'Sustainable Cities and Communities', 'Make cities and human settlements inclusive, safe, resilient and sustainable', '#FD9D24'),
(12, 'Responsible Consumption and Production', 'Ensure sustainable consumption and production patterns', '#BF8B2E'),
(13, 'Climate Action', 'Take urgent action to combat climate change and its impacts', '#3F7E44'),
(14, 'Life Below Water', 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development', '#0A97D9'),
(15, 'Life on Land', 'Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss', '#56C02B'),
(16, 'Peace, Justice and Strong Institutions', 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels', '#00689D'),
(17, 'Partnerships for the Goals', 'Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development', '#19486A');

-- Create SDG Targets reference table
CREATE TABLE IF NOT EXISTS sdg_targets (
  id TEXT PRIMARY KEY, -- e.g. "5.2"
  goal_number INTEGER NOT NULL,
  target_text TEXT NOT NULL,
  target_description TEXT NOT NULL,
  FOREIGN KEY (goal_number) REFERENCES sdg_goals(id)
);

-- Insert sample SDG targets (adding a few examples - full list would be 169 targets)
INSERT INTO sdg_targets (id, goal_number, target_text, target_description) VALUES
-- Goal 1 targets
('1.1', 1, 'Eradicate extreme poverty', 'By 2030, eradicate extreme poverty for all people everywhere, currently measured as people living on less than $1.25 a day'),
('1.2', 1, 'Reduce poverty by half', 'By 2030, reduce at least by half the proportion of men, women and children of all ages living in poverty in all its dimensions according to national definitions'),
('1.3', 1, 'Social protection systems', 'Implement nationally appropriate social protection systems and measures for all, including floors, and by 2030 achieve substantial coverage of the poor and the vulnerable'),
('1.4', 1, 'Equal rights to resources', 'By 2030, ensure that all men and women, in particular the poor and the vulnerable, have equal rights to economic resources, as well as access to basic services, ownership and control over land and other forms of property, inheritance, natural resources, appropriate new technology and financial services, including microfinance'),
('1.5', 1, 'Build resilience', 'By 2030, build the resilience of the poor and those in vulnerable situations and reduce their exposure and vulnerability to climate-related extreme events and other economic, social and environmental shocks and disasters'),

-- Goal 5 targets (Gender Equality examples)
('5.1', 5, 'End discrimination', 'End all forms of discrimination against all women and girls everywhere'),
('5.2', 5, 'Eliminate violence', 'Eliminate all forms of violence against all women and girls in the public and private spheres, including trafficking and sexual and other types of exploitation'),
('5.3', 5, 'Eliminate harmful practices', 'Eliminate all harmful practices, such as child, early and forced marriage and female genital mutilation'),
('5.4', 5, 'Value unpaid care', 'Recognize and value unpaid care and domestic work through the provision of public services, infrastructure and social protection policies and the promotion of shared responsibility within the household and the family as nationally appropriate'),
('5.5', 5, 'Women''s participation', 'Ensure women''s full and effective participation and equal opportunities for leadership at all levels of decision-making in political, economic and public life'),

-- Goal 13 targets (Climate Action examples)
('13.1', 13, 'Strengthen resilience', 'Strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries'),
('13.2', 13, 'Integrate climate measures', 'Integrate climate change measures into national policies, strategies and planning'),
('13.3', 13, 'Climate education', 'Improve education, awareness-raising and human and institutional capacity on climate change mitigation, adaptation, impact reduction and early warning');

-- Create activity SDG mappings table
CREATE TABLE IF NOT EXISTS activity_sdg_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL, -- references activities(id) on delete cascade
  sdg_goal INTEGER CHECK (sdg_goal BETWEEN 1 AND 17) NOT NULL,
  sdg_target TEXT NOT NULL, -- e.g. "5.2"
  contribution_percent NUMERIC CHECK (contribution_percent >= 0 AND contribution_percent <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (sdg_goal) REFERENCES sdg_goals(id),
  FOREIGN KEY (sdg_target) REFERENCES sdg_targets(id)
);

-- Create index for better query performance
CREATE INDEX idx_activity_sdg_mappings_activity_id ON activity_sdg_mappings(activity_id);
CREATE INDEX idx_activity_sdg_mappings_sdg_goal ON activity_sdg_mappings(sdg_goal);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activity_sdg_mappings_updated_at BEFORE UPDATE
    ON activity_sdg_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 