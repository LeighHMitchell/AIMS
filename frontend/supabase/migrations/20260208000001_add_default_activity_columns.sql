-- Add default_activity_columns JSONB column to users table
-- Stores the user's preferred default visible columns for the activity list
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_activity_columns JSONB;
