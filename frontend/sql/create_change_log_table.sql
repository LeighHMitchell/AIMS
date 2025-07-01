-- Create change_log table for tracking Data Clinic edits
-- This table records all manual fixes made via the Data Clinic feature

-- Drop table if exists (careful in production!)
-- DROP TABLE IF EXISTS change_log CASCADE;

-- Create the change_log table
CREATE TABLE IF NOT EXISTS change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('activity', 'transaction', 'organization')),
  entity_id UUID NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add index for performance
  CONSTRAINT fk_user
    FOREIGN KEY(user_id) 
    REFERENCES auth.users(id)
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_change_log_entity ON change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_log_user ON change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_change_log_timestamp ON change_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_field ON change_log(field);

-- Add comments for documentation
COMMENT ON TABLE change_log IS 'Audit log for tracking all changes made through the Data Clinic feature';
COMMENT ON COLUMN change_log.entity_type IS 'Type of entity that was changed (activity, transaction, organization)';
COMMENT ON COLUMN change_log.entity_id IS 'UUID of the entity that was changed';
COMMENT ON COLUMN change_log.field IS 'The field name that was changed';
COMMENT ON COLUMN change_log.old_value IS 'The previous value of the field';
COMMENT ON COLUMN change_log.new_value IS 'The new value of the field';
COMMENT ON COLUMN change_log.user_id IS 'UUID of the user who made the change';
COMMENT ON COLUMN change_log.timestamp IS 'When the change was made';

-- Grant appropriate permissions
GRANT SELECT, INSERT ON change_log TO authenticated;
GRANT SELECT ON change_log TO anon;

-- Optional: Create a view for easier querying with user names
CREATE OR REPLACE VIEW change_log_with_users AS
SELECT 
  cl.*,
  u.email as user_email,
  u.raw_user_meta_data->>'name' as user_name
FROM change_log cl
LEFT JOIN auth.users u ON cl.user_id = u.id
ORDER BY cl.timestamp DESC;

-- Grant permissions on the view
GRANT SELECT ON change_log_with_users TO authenticated;

-- Optional: Function to get change history for a specific entity
CREATE OR REPLACE FUNCTION get_entity_change_history(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  user_name TEXT,
  user_email TEXT,
  timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.field,
    cl.old_value,
    cl.new_value,
    u.raw_user_meta_data->>'name' as user_name,
    u.email as user_email,
    cl.timestamp
  FROM change_log cl
  LEFT JOIN auth.users u ON cl.user_id = u.id
  WHERE cl.entity_type = p_entity_type
    AND cl.entity_id = p_entity_id
  ORDER BY cl.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_entity_change_history(TEXT, UUID) TO authenticated; 