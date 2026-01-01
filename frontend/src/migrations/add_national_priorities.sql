-- ============================================
-- NATIONAL PRIORITIES SYSTEM
-- Hierarchical structure for strategic development priorities
-- Migration for Dashboard feature (Fragmentation Analysis)
-- ============================================

-- Main table for national priorities (hierarchical)
CREATE TABLE IF NOT EXISTS national_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_local VARCHAR(255),
  description TEXT,
  parent_id UUID REFERENCES national_priorities(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  -- Code must be unique within same parent (allows same code at different levels)
  CONSTRAINT unique_code_per_parent UNIQUE (parent_id, code)
);

-- Junction table for activity-priority relationships
CREATE TABLE IF NOT EXISTS activity_national_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  national_priority_id UUID NOT NULL REFERENCES national_priorities(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (percentage >= 0 AND percentage <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  -- Each activity can only be linked to each priority once
  CONSTRAINT unique_activity_priority UNIQUE (activity_id, national_priority_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- National priorities indexes
CREATE INDEX IF NOT EXISTS idx_national_priorities_parent ON national_priorities(parent_id);
CREATE INDEX IF NOT EXISTS idx_national_priorities_level ON national_priorities(level);
CREATE INDEX IF NOT EXISTS idx_national_priorities_active ON national_priorities(is_active);
CREATE INDEX IF NOT EXISTS idx_national_priorities_code ON national_priorities(code);
CREATE INDEX IF NOT EXISTS idx_national_priorities_display_order ON national_priorities(display_order);

-- Activity national priorities indexes
CREATE INDEX IF NOT EXISTS idx_activity_national_priorities_activity ON activity_national_priorities(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_national_priorities_priority ON activity_national_priorities(national_priority_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_national_priorities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_national_priorities_updated_at ON national_priorities;
CREATE TRIGGER trigger_update_national_priorities_updated_at
  BEFORE UPDATE ON national_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_national_priorities_updated_at();

DROP TRIGGER IF EXISTS trigger_update_activity_national_priorities_updated_at ON activity_national_priorities;
CREATE TRIGGER trigger_update_activity_national_priorities_updated_at
  BEFORE UPDATE ON activity_national_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_national_priorities_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE national_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_national_priorities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read national_priorities" ON national_priorities;
DROP POLICY IF EXISTS "Authenticated users can manage national_priorities" ON national_priorities;
DROP POLICY IF EXISTS "Anyone can read activity_national_priorities" ON activity_national_priorities;
DROP POLICY IF EXISTS "Authenticated users can manage activity_national_priorities" ON activity_national_priorities;

-- National priorities: Anyone can read, authenticated users can write
CREATE POLICY "Anyone can read national_priorities" ON national_priorities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage national_priorities" ON national_priorities
  FOR ALL USING (true);

-- Activity national priorities: Anyone can read, authenticated users can write
CREATE POLICY "Anyone can read activity_national_priorities" ON activity_national_priorities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage activity_national_priorities" ON activity_national_priorities
  FOR ALL USING (true);

-- ============================================
-- SAMPLE DATA (Optional - can be removed in production)
-- ============================================

-- Insert sample top-level priorities if table is empty
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM national_priorities LIMIT 1) THEN
--     INSERT INTO national_priorities (code, name, description, level, display_order, is_active) VALUES
--     ('SC', 'Social Capital', 'Human development, education, health, and social protection', 1, 1, true),
--     ('INF', 'Infrastructure', 'Physical infrastructure including roads, water, energy', 1, 2, true),
--     ('ECO', 'Economic Development', 'Private sector, agriculture, trade, and tourism', 1, 3, true),
--     ('GOV', 'Governance', 'Public administration, justice, and institutional reform', 1, 4, true);
--   END IF;
-- END $$;

