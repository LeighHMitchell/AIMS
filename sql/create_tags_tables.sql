-- Create tags table for storing all tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  vocabulary VARCHAR(10) NOT NULL DEFAULT '99', -- IATI vocabulary code (99 = custom)
  code VARCHAR(255) NOT NULL, -- IATI code attribute
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS activity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES users(id),
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_vocabulary ON tags(vocabulary);
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity_id ON activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tag_id ON activity_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tagged_by ON activity_tags(tagged_by);

-- Create function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update usage count
CREATE TRIGGER update_tag_usage_count_trigger
AFTER INSERT OR DELETE ON activity_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_count();

-- Insert some default IATI standard tags (vocabulary="1")
INSERT INTO tags (name, vocabulary, code, description) VALUES
  ('Climate Change', '1', 'climate-change', 'Activities related to climate change mitigation or adaptation'),
  ('Gender Equality', '1', 'gender-equality', 'Activities promoting gender equality and women empowerment'),
  ('Health', '1', 'health', 'Health-related activities'),
  ('Education', '1', 'education', 'Education and training activities'),
  ('Governance', '1', 'governance', 'Governance and civil society activities')
ON CONFLICT (name) DO NOTHING; 