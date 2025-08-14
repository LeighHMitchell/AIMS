-- Migration script to move existing documents from activities.documents JSON field
-- to the new activity_documents table

-- Create a function to migrate existing documents
CREATE OR REPLACE FUNCTION migrate_existing_documents()
RETURNS INTEGER AS $$
DECLARE
  activity_record RECORD;
  document_record JSONB;
  migrated_count INTEGER := 0;
  total_activities INTEGER := 0;
BEGIN
  -- Count total activities with documents
  SELECT COUNT(*) INTO total_activities
  FROM activities 
  WHERE documents IS NOT NULL 
  AND documents != 'null'::jsonb 
  AND jsonb_array_length(documents) > 0;

  RAISE NOTICE 'Starting migration of documents from % activities', total_activities;

  -- Loop through all activities that have documents
  FOR activity_record IN 
    SELECT id, documents, created_by
    FROM activities 
    WHERE documents IS NOT NULL 
    AND documents != 'null'::jsonb 
    AND jsonb_array_length(documents) > 0
  LOOP
    RAISE NOTICE 'Processing activity: %', activity_record.id;
    
    -- Loop through each document in the JSON array
    FOR document_record IN 
      SELECT * FROM jsonb_array_elements(activity_record.documents)
    LOOP
      BEGIN
        -- Insert document into activity_documents table
        INSERT INTO activity_documents (
          activity_id,
          url,
          format,
          title,
          description,
          category_code,
          language_codes,
          document_date,
          recipient_countries,
          file_name,
          file_size,
          thumbnail_url,
          is_external,
          uploaded_by,
          created_at
        ) VALUES (
          activity_record.id,
          document_record->>'url',
          COALESCE(document_record->>'format', 'application/octet-stream'),
          -- Handle title - convert to JSONB array if it's a string or already an array
          CASE 
            WHEN document_record->'title' IS NULL THEN 
              '[{"text": "Untitled", "lang": "en"}]'::jsonb
            WHEN jsonb_typeof(document_record->'title') = 'string' THEN 
              jsonb_build_array(jsonb_build_object('text', document_record->>'title', 'lang', 'en'))
            WHEN jsonb_typeof(document_record->'title') = 'array' THEN 
              document_record->'title'
            ELSE 
              '[{"text": "Untitled", "lang": "en"}]'::jsonb
          END,
          -- Handle description - convert to JSONB array if it's a string or already an array
          CASE 
            WHEN document_record->'description' IS NULL THEN 
              '[{"text": "", "lang": "en"}]'::jsonb
            WHEN jsonb_typeof(document_record->'description') = 'string' THEN 
              jsonb_build_array(jsonb_build_object('text', document_record->>'description', 'lang', 'en'))
            WHEN jsonb_typeof(document_record->'description') = 'array' THEN 
              document_record->'description'
            ELSE 
              '[{"text": "", "lang": "en"}]'::jsonb
          END,
          COALESCE(document_record->>'categoryCode', 'A01'),
          -- Handle languageCodes - convert to text array
          CASE 
            WHEN document_record->'languageCodes' IS NULL THEN 
              ARRAY['en']
            WHEN jsonb_typeof(document_record->'languageCodes') = 'array' THEN 
              ARRAY(SELECT jsonb_array_elements_text(document_record->'languageCodes'))
            ELSE 
              ARRAY['en']
          END,
          -- Handle documentDate
          CASE 
            WHEN document_record->>'documentDate' IS NOT NULL 
            AND document_record->>'documentDate' != '' THEN 
              (document_record->>'documentDate')::date
            ELSE 
              NULL
          END,
          -- Handle recipientCountries - convert to text array
          CASE 
            WHEN document_record->'recipientCountries' IS NULL THEN 
              ARRAY[]::text[]
            WHEN jsonb_typeof(document_record->'recipientCountries') = 'array' THEN 
              ARRAY(SELECT jsonb_array_elements_text(document_record->'recipientCountries'))
            ELSE 
              ARRAY[]::text[]
          END,
          -- Extract filename from URL or use a default
          CASE 
            WHEN document_record->>'url' LIKE '%/%' THEN 
              split_part(document_record->>'url', '/', -1)
            ELSE 
              'document'
          END,
          COALESCE((document_record->>'fileSize')::bigint, 0),
          document_record->>'thumbnailUrl',
          -- Determine if external based on URL pattern
          CASE 
            WHEN document_record->>'url' LIKE 'http%' 
            AND document_record->>'url' NOT LIKE '%' || current_setting('app.domain', true) || '%' THEN 
              true
            ELSE 
              false
          END,
          -- Use activity creator as uploader if available
          CASE 
            WHEN activity_record.created_by IS NOT NULL 
            AND activity_record.created_by != '' THEN 
              activity_record.created_by::uuid
            ELSE 
              NULL
          END,
          NOW()
        );
        
        migrated_count := migrated_count + 1;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to migrate document for activity %: %', activity_record.id, SQLERRM;
        CONTINUE;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Migration completed. Migrated % documents from % activities', migrated_count, total_activities;
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_existing_documents();

-- Create a backup of the original documents JSON data
-- (in case we need to rollback)
CREATE TABLE IF NOT EXISTS activity_documents_backup AS
SELECT 
  id as activity_id,
  documents as original_documents_json,
  NOW() as backup_created_at
FROM activities 
WHERE documents IS NOT NULL 
AND documents != 'null'::jsonb 
AND jsonb_array_length(documents) > 0;

-- Add comment to backup table
COMMENT ON TABLE activity_documents_backup IS 'Backup of original documents JSON data before migration to activity_documents table';

-- After successful migration, you can optionally clear the documents JSON field
-- Uncomment the following lines if you want to clear the old JSON data:

-- UPDATE activities 
-- SET documents = NULL 
-- WHERE documents IS NOT NULL 
-- AND documents != 'null'::jsonb 
-- AND jsonb_array_length(documents) > 0;

-- COMMENT ON COLUMN activities.documents IS 'DEPRECATED: Documents are now stored in activity_documents table. This field is kept for backward compatibility.';

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_existing_documents();

-- Create a function to verify the migration
CREATE OR REPLACE FUNCTION verify_document_migration()
RETURNS TABLE (
  activity_id UUID,
  original_count BIGINT,
  migrated_count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as activity_id,
    CASE 
      WHEN a.documents IS NOT NULL AND a.documents != 'null'::jsonb THEN 
        jsonb_array_length(a.documents)
      ELSE 
        0
    END as original_count,
    COUNT(ad.id) as migrated_count,
    CASE 
      WHEN CASE 
        WHEN a.documents IS NOT NULL AND a.documents != 'null'::jsonb THEN 
          jsonb_array_length(a.documents)
        ELSE 
          0
      END = COUNT(ad.id) THEN 
        'SUCCESS'
      ELSE 
        'MISMATCH'
    END as status
  FROM activities a
  LEFT JOIN activity_documents ad ON ad.activity_id = a.id
  WHERE a.documents IS NOT NULL 
  AND a.documents != 'null'::jsonb 
  AND jsonb_array_length(a.documents) > 0
  GROUP BY a.id, a.documents
  ORDER BY status DESC, activity_id;
END;
$$ LANGUAGE plpgsql;

-- Run verification
SELECT * FROM verify_document_migration();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_document_migration() TO authenticated;
