-- Insert predefined policy markers
INSERT INTO policy_markers (code, name, description, marker_type, display_order) VALUES
-- Environmental (Rio Markers)
('climate_mitigation', 'Climate Change Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', 1),
('climate_adaptation', 'Climate Change Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', 2),
('biodiversity', 'Biodiversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', 3),
('desertification', 'Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', 4),
('environment', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', 5),

-- Social & Governance
('gender_equality', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', 6),
('good_governance', 'Good Governance', 'Activities that support democratic governance and civil society', 'social_governance', 7),
('participatory_dev', 'Participatory Development', 'Activities that emphasize stakeholder participation in design and implementation', 'social_governance', 8),
('human_rights', 'Human Rights', 'Activities that support or promote human rights', 'social_governance', 9),
('rule_of_law', 'Rule of Law', 'Activities that strengthen legal and judicial systems', 'social_governance', 10),
('trade_development', 'Trade Development', 'Activities that build trade capacity and support trade facilitation', 'social_governance', 11),

-- Other Cross-Cutting Issues
('disability', 'Disability Inclusion', 'Activities that promote inclusion of persons with disabilities', 'other', 12),
('nutrition', 'Nutrition', 'Activities that address nutrition outcomes', 'other', 13),
('peacebuilding', 'Peacebuilding / Conflict Sensitivity', 'Activities that contribute to peace and conflict prevention', 'other', 14),
('rural_development', 'Rural Development', 'Activities focused on rural areas and communities', 'other', 15),
('urban_development', 'Urban Development', 'Activities focused on urban areas and cities', 'other', 16),
('digitalization', 'Digitalization / Technology', 'Activities that leverage digital technologies', 'other', 17),
('private_sector', 'Private Sector Engagement', 'Activities that engage or strengthen private sector', 'other', 18)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;