-- Fix search RPC functions that are broken on the live database
-- =============================================================
--
-- Two bugs were observed at runtime (the live functions are out of sync with
-- migration 20251223000002):
--
--   1. search_all() raised "structure of query does not match function result
--      type" on EVERY call, forcing the API into a slow unindexed ILIKE
--      fallback. Root cause: the `rank` column type is ambiguous across the
--      UNION branches (some branches multiply ts_rank_cd (real) by a numeric
--      literal -> numeric, others stay real). This recreates the function with
--      every branch's rank explicitly cast to ::REAL so the returned structure
--      always matches RETURNS TABLE (... rank REAL ...).
--
--   2. search_suggestions() raised "invalid input syntax for type uuid:
--      <sector_code>" whenever a query matched a sector (e.g. "health" ->
--      12110), because the live function declared `id UUID` while the sector
--      branch yields a sector CODE. This recreates it with `id TEXT` so sector
--      codes, activity/org UUIDs, etc. all coexist.
--
-- Return-type changes require DROP before CREATE (CREATE OR REPLACE cannot
-- change a function's result type). The signatures below match how the API
-- (PostgREST RPC) calls them, so the live functions are dropped cleanly.

-- =====================================================
-- search_all  (rank explicitly REAL in every branch)
-- =====================================================
DROP FUNCTION IF EXISTS search_all(text, integer, integer, boolean, double precision);

CREATE FUNCTION search_all(
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
  WITH fts_results AS (
    -- Activities
    SELECT
      a.id,
      'activity'::TEXT as entity_type,
      a.title_narrative::TEXT as title,
      COALESCE(a.other_identifier, a.iati_identifier, a.acronym)::TEXT as subtitle,
      (ts_rank_cd(a.search_vector, tsquery_val, 32) *
        CASE WHEN a.title_narrative ILIKE '%' || clean_query || '%' THEN 2.0 ELSE 1.0 END)::REAL as rank,
      jsonb_build_object(
        'acronym', a.acronym,
        'status', a.activity_status,
        'updated_at', a.updated_at,
        'reporting_org', a.created_by_org_name,
        'reporting_org_acronym', a.created_by_org_acronym,
        'partner_id', a.other_identifier,
        'iati_id', a.iati_identifier,
        'iati_identifier', a.iati_identifier,
        'activity_icon_url', CASE WHEN a.icon IS NOT NULL AND a.icon NOT LIKE '%unsplash.com%' THEN a.icon ELSE NULL END
      ) as metadata
    FROM activities a
    WHERE a.search_vector @@ tsquery_val

    UNION ALL

    -- Organizations
    SELECT
      o.id,
      'organization'::TEXT,
      o.name::TEXT,
      COALESCE(o.acronym, o.iati_org_id, o.country)::TEXT,
      (ts_rank_cd(o.search_vector, tsquery_val, 32) *
        CASE WHEN o.name ILIKE '%' || clean_query || '%' THEN 2.0 ELSE 1.0 END)::REAL,
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

    -- Users
    SELECT
      u.id,
      'user'::TEXT,
      TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))::TEXT,
      u.email::TEXT,
      ts_rank_cd(u.search_vector, tsquery_val, 32)::REAL,
      jsonb_build_object(
        'profile_picture_url', u.avatar_url
      )
    FROM users u
    WHERE u.search_vector @@ tsquery_val

    UNION ALL

    -- Tags
    SELECT
      t.id,
      'tag'::TEXT,
      t.name::TEXT,
      COALESCE(t.code, '')::TEXT,
      ts_rank_cd(t.search_vector, tsquery_val, 32)::REAL,
      jsonb_build_object(
        'code', t.code,
        'activity_count', (SELECT COUNT(*) FROM activity_tags at WHERE at.tag_id = t.id)
      )
    FROM tags t
    WHERE t.search_vector @@ tsquery_val

    UNION ALL

    -- Activity Contacts
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
      ts_rank_cd(ac.search_vector, tsquery_val, 32)::REAL,
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
          'iati_identifier', a.iati_identifier,
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
    cr.rank::REAL,
    cr.metadata
  FROM combined_results cr
  WHERE cr.title IS NOT NULL AND cr.title != ''
  ORDER BY cr.rank DESC, cr.title ASC
  LIMIT result_limit
  OFFSET result_offset;

END;
$$;

-- =====================================================
-- search_suggestions  (id TEXT so sector codes are safe)
-- =====================================================
DROP FUNCTION IF EXISTS search_suggestions(text, integer);

CREATE FUNCTION search_suggestions(
  search_query TEXT,
  result_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id TEXT,
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
  clean_query := trim(search_query);

  IF clean_query = '' OR clean_query IS NULL OR length(clean_query) < 2 THEN
    RETURN;
  END IF;

  -- Prefix search (append :* to each word for autocomplete-style matching)
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
    (SELECT
      a.id::TEXT,
      'activity'::TEXT as entity_type,
      a.title_narrative::TEXT as title,
      COALESCE(a.other_identifier, a.iati_identifier)::TEXT as subtitle,
      ts_rank_cd(a.search_vector, prefix_query, 32)::REAL as rank
    FROM activities a
    WHERE a.search_vector @@ prefix_query
    LIMIT 4)

    UNION ALL

    -- Organizations
    (SELECT
      o.id::TEXT,
      'organization'::TEXT,
      o.name::TEXT,
      COALESCE(o.acronym, o.country)::TEXT,
      ts_rank_cd(o.search_vector, prefix_query, 32)::REAL
    FROM organizations o
    WHERE o.search_vector @@ prefix_query
    LIMIT 3)

    UNION ALL

    -- Sectors (ILIKE; sector code is TEXT and lives in the TEXT id column)
    (SELECT
      s.sector_code::TEXT as id,
      'sector'::TEXT,
      s.sector_name::TEXT,
      s.sector_code::TEXT,
      0.5::REAL
    FROM activity_sectors s
    WHERE s.sector_name ILIKE '%' || clean_query || '%'
    GROUP BY s.sector_code, s.sector_name
    LIMIT 2)
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
-- Re-grant execute permissions (dropped functions lose grants)
-- =====================================================
GRANT EXECUTE ON FUNCTION search_all TO authenticated;
GRANT EXECUTE ON FUNCTION search_all TO anon;
GRANT EXECUTE ON FUNCTION search_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION search_suggestions TO anon;

COMMENT ON FUNCTION search_all IS 'Unified full-text search across all entities with fuzzy fallback. Rank explicitly REAL in every branch. Returns results ranked by relevance.';
COMMENT ON FUNCTION search_suggestions IS 'Fast autocomplete suggestions using prefix matching. id is TEXT so sector codes coexist with entity UUIDs.';
