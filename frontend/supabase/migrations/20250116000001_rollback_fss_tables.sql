-- Rollback migration for FSS tables
-- Run this if you need to remove the FSS feature

DROP TABLE IF EXISTS fss_forecasts CASCADE;
DROP TABLE IF EXISTS forward_spending_survey CASCADE;

