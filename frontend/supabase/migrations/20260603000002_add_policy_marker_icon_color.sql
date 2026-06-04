-- Allow super users to customise a policy marker's icon and theme color via the
-- Policy Marker editor. Both are optional; display falls back to the code-based
-- icon map and marker-type color palette when null.

ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS color TEXT;

COMMENT ON COLUMN policy_markers.icon IS 'Optional lucide-react icon key (see POLICY_MARKER_ICON_OPTIONS); overrides the iati_code-based default icon.';
COMMENT ON COLUMN policy_markers.color IS 'Optional theme color (hex, e.g. #2563EB); overrides the marker-type palette color.';
