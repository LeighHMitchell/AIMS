-- Add land acquisition and resettlement detail fields
ALTER TABLE project_bank_projects
  ADD COLUMN IF NOT EXISTS land_acquisition_hectares numeric,
  ADD COLUMN IF NOT EXISTS land_acquisition_details text,
  ADD COLUMN IF NOT EXISTS resettlement_details text;
