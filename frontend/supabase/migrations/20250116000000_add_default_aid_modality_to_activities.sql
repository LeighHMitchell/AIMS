-- Add default_aid_modality and default_aid_modality_override columns to activities table
ALTER TABLE activities
  ADD COLUMN default_aid_modality text,
  ADD COLUMN default_aid_modality_override boolean; 