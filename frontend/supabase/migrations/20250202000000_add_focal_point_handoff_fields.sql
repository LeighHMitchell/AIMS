-- Migration: Add Focal Point Handoff Fields
-- Purpose: Enable focal point assignment by super users and handoff workflow
-- Date: 2025-02-02

-- Add focal point status and handoff tracking fields to activity_contacts
ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS focal_point_status TEXT DEFAULT 'assigned' 
  CHECK (focal_point_status IN ('assigned', 'pending_handoff', 'accepted'));

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS assigned_by_name TEXT;

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS handed_off_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS handed_off_by_name TEXT;

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS handed_off_at TIMESTAMPTZ;

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS handed_off_to UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activity_contacts 
ADD COLUMN IF NOT EXISTS focal_point_responded_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN activity_contacts.focal_point_status IS 'Status of focal point assignment: assigned (by super user), pending_handoff (awaiting acceptance), accepted (handoff accepted)';
COMMENT ON COLUMN activity_contacts.assigned_by IS 'User ID who assigned this focal point (super user or previous focal point)';
COMMENT ON COLUMN activity_contacts.assigned_by_name IS 'Denormalized name of the assigning user for display';
COMMENT ON COLUMN activity_contacts.assigned_at IS 'Timestamp when the focal point was assigned';
COMMENT ON COLUMN activity_contacts.handed_off_by IS 'User ID who initiated the handoff';
COMMENT ON COLUMN activity_contacts.handed_off_by_name IS 'Denormalized name of the user who initiated handoff';
COMMENT ON COLUMN activity_contacts.handed_off_at IS 'Timestamp when handoff was initiated';
COMMENT ON COLUMN activity_contacts.handed_off_to IS 'Target user ID for pending handoff';
COMMENT ON COLUMN activity_contacts.focal_point_responded_at IS 'Timestamp when handoff was accepted or declined';

-- Create index for efficient pending handoff queries
CREATE INDEX IF NOT EXISTS idx_activity_contacts_pending_handoff 
ON activity_contacts(handed_off_to) 
WHERE focal_point_status = 'pending_handoff';

-- Create index for focal point status queries
CREATE INDEX IF NOT EXISTS idx_activity_contacts_focal_point_status 
ON activity_contacts(focal_point_status) 
WHERE type IN ('government_focal_point', 'development_partner_focal_point');

-- Create index for assigned_by queries
CREATE INDEX IF NOT EXISTS idx_activity_contacts_assigned_by 
ON activity_contacts(assigned_by) 
WHERE assigned_by IS NOT NULL;

-- Update existing focal point records to have 'assigned' status
UPDATE activity_contacts 
SET focal_point_status = 'assigned'
WHERE type IN ('government_focal_point', 'development_partner_focal_point')
AND focal_point_status IS NULL;


