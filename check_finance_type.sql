-- Check what finance type is set on the failing activity
SELECT 
    id, 
    title_narrative, 
    default_finance_type,
    default_aid_type,
    default_flow_type,
    default_tied_status
FROM activities 
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

