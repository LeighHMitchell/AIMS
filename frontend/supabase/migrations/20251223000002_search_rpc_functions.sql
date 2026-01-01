-- Search Supercharging: Unified Search RPC Functions
-- This migration creates optimized RPC functions for full-text and fuzzy search

-- =====================================================
-- UNIFIED SEARCH FUNCTION: search_all
-- =====================================================

CREATE OR REPLACE FUNCTION search_all(
  search_query TEXT,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0,
  include_fuzzy BOOLEAN DEFAULT true,
  min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  title TEXT,
  subtitle TEXT,
  rank REAL,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tsquery_val tsquery;
  clean_query TEXT;
  exact_count INTEGER;
BEGIN
  -- Clean and prepare the search query
  clean_query := trim(search_query);
  
  -- Return empty if no query
  IF clean_query = '' OR clean_query IS NULL THEN
    RETURN;
  END IF;
  
  -- Convert to tsquery using websearch syntax for natural language support
  -- websearch_to_tsquery handles phrases, operators, etc.
  BEGIN
    tsquery_val := websearch_to_tsquery('english', clean_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to plainto_tsquery if websearch fails
    tsquery_val := plainto_tsquery('english', clean_query);
  END;
  
  -- First, try full-text search with ranking
  RETURN QUERY
  WITH fts_results AS (
    -- Activities (full-text search)
    SELECT 
      a.id,
      'activity'::TEXT as entity_type,
      a.title_narrative::TEXT as title,
      COALESCE(a.other_identifier, a.iati_identifier, a.acronym)::TEXT as subtitle,
      ts_rank_cd(a.search_vector, tsquery_val, 32) * 
        CASE WHEN a.title_narrative ILIKE '%' || clean_query || '%' THEN 2.0 ELSE 1.0 END as rank,
      jsonb_build_object(
        'acronym', a.acronym,
        'status', a.activity_status,
        'updated_at', a.updated_at,
        'reporting_org', a.created_by_org_name,
        'reporting_org_acronym', a.created_by_org_acronym,
        'partner_id', a.other_identifier,
        'iati_id', a.iati_identifier,
        'activity_icon_url', CASE WHEN a.icon IS NOT NULL AND a.icon NOT LIKE '%unsplash.com%' THEN a.icon ELSE NULL END
      ) as metadata
    FROM activities a
    WHERE a.search_vector @@ tsquery_val
    
    UNION ALL
    
    -- Organizations (full-text search)
    SELECT 
      o.id,
      'organization'::TEXT,
      o.name::TEXT,
      COALESCE(o.acronym, o.iati_org_id, o.country)::TEXT,
      ts_rank_cd(o.search_vector, tsquery_val, 32) * 
        CASE WHEN o.name ILIKE '%' || clean_query || '%' THEN 2.0 ELSE 1.0 END,
      jsonb_build_object(
        'acronym', o.acronym,
        'iati_identifier', o.iati_org_id,
        'type', o.type,
        'country', o.country,
        'logo_url', o.logo,
        'banner_url', o.banner
      )
    FROM organizations o
    WHERE o.search_vector @@ tsquery_val
    
    UNION ALL
    
    -- Users (full-text search)
    SELECT 
      u.id,
      'user'::TEXT,
      TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::TEXT,
      u.email::TEXT,
      ts_rank_cd(u.search_vector, tsquery_val, 32),
      jsonb_build_object(
        'profile_picture_url', u.avatar_url
      )
    FROM users u
    WHERE u.search_vector @@ tsquery_val
    
    UNION ALL
    
    -- Tags (full-text search)
    SELECT 
      t.id,
      'tag'::TEXT,
      t.name::TEXT,
      COALESCE(t.code, '')::TEXT,
      ts_rank_cd(t.search_vector, tsquery_val, 32),
      jsonb_build_object(
        'code', t.code,
        'activity_count', (SELECT COUNT(*) FROM activity_tags at WHERE at.tag_id = t.id)
      )
    FROM tags t
    WHERE t.search_vector @@ tsquery_val
    
    UNION ALL
    
    -- Activity Contacts (full-text search)
    SELECT 
      ac.id,
      'contact'::TEXT,
      TRIM(
        COALESCE(ac.title, '') || ' ' || 
        COALESCE(ac.first_name, '') || ' ' || 
        COALESCE(ac.middle_name, '') || ' ' || 
        COALESCE(ac.last_name, '')
      )::TEXT,
      COALESCE(ac.position, ac.organisation, '')::TEXT,
      ts_rank_cd(ac.search_vector, tsquery_val, 32),
      jsonb_build_object(
        'activity_id', ac.activity_id,
        'position', ac.position,
        'organisation', ac.organisation,
        'email', ac.email,
        'phone', ac.phone,
        'contact_type', ac.type
      )
    FROM activity_contacts ac
    WHERE ac.search_vector @@ tsquery_val
  ),
  
  -- Fuzzy fallback using trigram similarity (only if include_fuzzy is true)
  fuzzy_results AS (
    SELECT * FROM (
      -- Activities (fuzzy)
      SELECT 
        a.id,
        'activity'::TEXT as entity_type,
        a.title_narrative::TEXT as title,
        COALESCE(a.other_identifier, a.iati_identifier, a.acronym)::TEXT as subtitle,
        (similarity(a.title_narrative, clean_query) * 0.5)::REAL as rank,
        jsonb_build_object(
          'acronym', a.acronym,
          'status', a.activity_status,
          'updated_at', a.updated_at,
          'reporting_org', a.created_by_org_name,
          'reporting_org_acronym', a.created_by_org_acronym,
          'partner_id', a.other_identifier,
          'iati_id', a.iati_identifier,
          'activity_icon_url', CASE WHEN a.icon IS NOT NULL AND a.icon NOT LIKE '%unsplash.com%' THEN a.icon ELSE NULL END
        ) as metadata
      FROM activities a
      WHERE include_fuzzy 
        AND a.title_narrative % clean_query
        AND similarity(a.title_narrative, clean_query) >= min_similarity
        AND a.id NOT IN (SELECT fts.id FROM fts_results fts WHERE fts.entity_type = 'activity')
      
      UNION ALL
      
      -- Organizations (fuzzy)
      SELECT 
        o.id,
        'organization'::TEXT,
        o.name::TEXT,
        COALESCE(o.acronym, o.iati_org_id, o.country)::TEXT,
        (similarity(o.name, clean_query) * 0.5)::REAL,
        jsonb_build_object(
          'acronym', o.acronym,
          'iati_identifier', o.iati_org_id,
          'type', o.type,
          'country', o.country,
          'logo_url', o.logo,
          'banner_url', o.banner
        )
      FROM organizations o
      WHERE include_fuzzy 
        AND o.name % clean_query
        AND similarity(o.name, clean_query) >= min_similarity
        AND o.id NOT IN (SELECT fts.id FROM fts_results fts WHERE fts.entity_type = 'organization')
    ) fuzzy_sub
  ),
  
  -- Combine results
  combined_results AS (
    SELECT * FROM fts_results
    UNION ALL
    SELECT * FROM fuzzy_results
  )
  
  SELECT 
    cr.id,
    cr.entity_type,
    cr.title,
    cr.subtitle,
    cr.rank,
    cr.metadata
  FROM combined_results cr
  WHERE cr.title IS NOT NULL AND cr.title != ''
  ORDER BY cr.rank DESC, cr.title ASC
  LIMIT result_limit
  OFFSET result_offset;
  
END;
$$;

-- =====================================================
-- SEARCH SUGGESTIONS FUNCTION: search_suggestions
-- =====================================================

CREATE OR REPLACE FUNCTION search_suggestions(
  search_query TEXT,
  result_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  title TEXT,
  subtitle TEXT,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix_query tsquery;
  clean_query TEXT;
BEGIN
  -- Clean the search query
  clean_query := trim(search_query);
  
  -- Return empty if query too short
  IF clean_query = '' OR clean_query IS NULL OR length(clean_query) < 2 THEN
    RETURN;
  END IF;
  
  -- Create a prefix search query (adds :* to each word for prefix matching)
  prefix_query := to_tsquery('english', 
    array_to_string(
      ARRAY(
        SELECT word || ':*' 
        FROM unnest(string_to_array(clean_query, ' ')) AS word 
        WHERE word != ''
      ), 
      ' & '
    )
  );
  
  RETURN QUERY
  WITH suggestions AS (
    -- Activities
    SELECT 
      a.id,
      'activity'::TEXT as entity_type,
      a.title_narrative::TEXT as title,
      COALESCE(a.other_identifier, a.iati_identifier)::TEXT as subtitle,
      ts_rank_cd(a.search_vector, prefix_query, 32)::REAL as rank
    FROM activities a
    WHERE a.search_vector @@ prefix_query
    LIMIT 4
    
    UNION ALL
    
    -- Organizations
    SELECT 
      o.id,
      'organization'::TEXT,
      o.name::TEXT,
      COALESCE(o.acronym, o.country)::TEXT,
      ts_rank_cd(o.search_vector, prefix_query, 32)::REAL
    FROM organizations o
    WHERE o.search_vector @@ prefix_query
    LIMIT 3
    
    UNION ALL
    
    -- Sectors (using ILIKE since they don't have search_vector)
    SELECT 
      s.sector_code::UUID as id,
      'sector'::TEXT,
      s.sector_name::TEXT,
      s.sector_code::TEXT,
      0.5::REAL
    FROM activity_sectors s
    WHERE s.sector_name ILIKE '%' || clean_query || '%'
    GROUP BY s.sector_code, s.sector_name
    LIMIT 2
  )
  
  SELECT DISTINCT ON (s.title)
    s.id,
    s.entity_type,
    s.title,
    s.subtitle,
    s.rank
  FROM suggestions s
  WHERE s.title IS NOT NULL AND s.title != ''
  ORDER BY s.title, s.rank DESC
  LIMIT result_limit;
  
END;
$$;

-- =====================================================
-- SEARCH COUNT FUNCTION: search_count
-- =====================================================

CREATE OR REPLACE FUNCTION search_count(
  search_query TEXT
)
RETURNS TABLE (
  entity_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tsquery_val tsquery;
  clean_query TEXT;
BEGIN
  clean_query := trim(search_query);
  
  IF clean_query = '' OR clean_query IS NULL THEN
    RETURN;
  END IF;
  
  BEGIN
    tsquery_val := websearch_to_tsquery('english', clean_query);
  EXCEPTION WHEN OTHERS THEN
    tsquery_val := plainto_tsquery('english', clean_query);
  END;
  
  RETURN QUERY
  SELECT 'activity'::TEXT, COUNT(*)::BIGINT
  FROM activities WHERE search_vector @@ tsquery_val
  UNION ALL
  SELECT 'organization'::TEXT, COUNT(*)::BIGINT
  FROM organizations WHERE search_vector @@ tsquery_val
  UNION ALL
  SELECT 'user'::TEXT, COUNT(*)::BIGINT
  FROM users WHERE search_vector @@ tsquery_val
  UNION ALL
  SELECT 'tag'::TEXT, COUNT(*)::BIGINT
  FROM tags WHERE search_vector @@ tsquery_val
  UNION ALL
  SELECT 'contact'::TEXT, COUNT(*)::BIGINT
  FROM activity_contacts WHERE search_vector @@ tsquery_val;
  
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION search_all TO authenticated;
GRANT EXECUTE ON FUNCTION search_all TO anon;
GRANT EXECUTE ON FUNCTION search_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION search_suggestions TO anon;
GRANT EXECUTE ON FUNCTION search_count TO authenticated;
GRANT EXECUTE ON FUNCTION search_count TO anon;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION search_all IS 'Unified full-text search across all entities with fuzzy fallback. Returns results ranked by relevance.';
COMMENT ON FUNCTION search_suggestions IS 'Fast autocomplete suggestions using prefix matching. Optimized for speed over comprehensiveness.';
COMMENT ON FUNCTION search_count IS 'Returns count of matching results by entity type for faceted search.';




