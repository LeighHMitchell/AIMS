-- Create activity_relationships table for IATI-compliant linked activities
CREATE TABLE IF NOT EXISTS activity_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  related_activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(10) NOT NULL CHECK (relationship_type IN ('1', '2', '3', '4', '5')),
  narrative TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate relationships
  UNIQUE(activity_id, related_activity_id),
  -- Prevent self-referencing
  CHECK (activity_id != related_activity_id)
);

-- Create indexes for performance
CREATE INDEX idx_activity_relationships_activity_id ON activity_relationships(activity_id);
CREATE INDEX idx_activity_relationships_related_activity_id ON activity_relationships(related_activity_id);

-- Enable RLS
ALTER TABLE activity_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view activity relationships" ON activity_relationships
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create activity relationships" ON activity_relationships
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update activity relationships" ON activity_relationships
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete activity relationships" ON activity_relationships
  FOR DELETE USING (auth.uid() IS NOT NULL);
