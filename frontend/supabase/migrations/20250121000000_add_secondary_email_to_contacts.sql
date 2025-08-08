-- Add secondary_email field to activity_contacts table
ALTER TABLE activity_contacts ADD COLUMN IF NOT EXISTS secondary_email TEXT;