-- Add inherited flags for flow_type, aid_type, and tied_status
-- These flags track when values are inherited from activity defaults rather than explicitly set on the transaction

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS flow_type_inherited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aid_type_inherited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tied_status_inherited BOOLEAN DEFAULT FALSE;

-- Add comments to document the purpose
COMMENT ON COLUMN transactions.flow_type_inherited IS 'TRUE if flow_type was inherited from activity default_flow_type';
COMMENT ON COLUMN transactions.aid_type_inherited IS 'TRUE if aid_type was inherited from activity default_aid_type';
COMMENT ON COLUMN transactions.tied_status_inherited IS 'TRUE if tied_status was inherited from activity default_tied_status';
COMMENT ON COLUMN transactions.finance_type_inherited IS 'TRUE if finance_type was inherited from activity default_finance_type';
