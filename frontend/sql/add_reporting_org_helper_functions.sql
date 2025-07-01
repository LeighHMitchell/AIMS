-- Helper functions for safe schema operations
-- These functions help perform DDL operations idempotently

-- Function to check if a column exists
CREATE OR REPLACE FUNCTION column_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_schema_name TEXT DEFAULT 'public'
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = p_schema_name
    AND table_name = p_table_name 
    AND column_name = p_column_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a constraint exists
CREATE OR REPLACE FUNCTION constraint_exists(
  p_constraint_name TEXT,
  p_schema_name TEXT DEFAULT 'public'
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = p_schema_name
    AND constraint_name = p_constraint_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to safely add a column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_column_type TEXT,
  p_column_comment TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_sql TEXT;
BEGIN
  IF NOT column_exists(p_table_name, p_column_name) THEN
    v_sql := format('ALTER TABLE %I ADD COLUMN %I %s', p_table_name, p_column_name, p_column_type);
    EXECUTE v_sql;
    
    IF p_column_comment IS NOT NULL THEN
      v_sql := format('COMMENT ON COLUMN %I.%I IS %L', p_table_name, p_column_name, p_column_comment);
      EXECUTE v_sql;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely add a unique constraint
CREATE OR REPLACE FUNCTION add_unique_constraint_if_not_exists(
  p_table_name TEXT,
  p_constraint_name TEXT,
  p_column_name TEXT
) RETURNS VOID AS $$
DECLARE
  v_sql TEXT;
BEGIN
  IF NOT constraint_exists(p_constraint_name) THEN
    v_sql := format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (%I)', p_table_name, p_constraint_name, p_column_name);
    EXECUTE v_sql;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely add a foreign key constraint
CREATE OR REPLACE FUNCTION add_foreign_key_if_not_exists(
  p_table_name TEXT,
  p_constraint_name TEXT,
  p_column_name TEXT,
  p_foreign_table_name TEXT,
  p_foreign_column_name TEXT,
  p_on_delete_action TEXT DEFAULT 'RESTRICT'
) RETURNS VOID AS $$
DECLARE
  v_sql TEXT;
BEGIN
  IF NOT constraint_exists(p_constraint_name) THEN
    v_sql := format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE %s',
      p_table_name, p_constraint_name, p_column_name, p_foreign_table_name, p_foreign_column_name, p_on_delete_action);
    EXECUTE v_sql;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create the activities with reporting org view
CREATE OR REPLACE FUNCTION create_activities_reporting_org_view() RETURNS VOID AS $$
BEGIN
  CREATE OR REPLACE VIEW activities_with_reporting_org AS
  SELECT
    a.*,
    o.iati_org_id AS reporting_org_ref,
    o.organisation_type AS reporting_org_type,
    o.name AS reporting_org_name
  FROM public.activities a
  LEFT JOIN public.organizations o ON a.reporting_org_id = o.id;
  
  COMMENT ON VIEW activities_with_reporting_org IS 'Activities with normalized reporting organization information from organizations table';
END;
$$ LANGUAGE plpgsql;

-- Function to check for duplicate iati_org_ids
CREATE OR REPLACE FUNCTION check_duplicate_iati_org_ids()
RETURNS TABLE(iati_org_id TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT o.iati_org_id, COUNT(*) as count
  FROM organizations o
  WHERE o.iati_org_id IS NOT NULL
  GROUP BY o.iati_org_id
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql; 