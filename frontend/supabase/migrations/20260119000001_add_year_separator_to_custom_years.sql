-- Add year_separator and second_year_format columns to custom_years table
-- Migration: 20260119000001_add_year_separator_to_custom_years.sql
-- Allows choosing between hyphen (-) or forward slash (/) as the separator between years
-- Allows choosing between short (24) or full (2024) format for the second year

ALTER TABLE custom_years
ADD COLUMN IF NOT EXISTS year_separator VARCHAR(1) DEFAULT '-' CHECK (year_separator IN ('-', '/'));

ALTER TABLE custom_years
ADD COLUMN IF NOT EXISTS second_year_format VARCHAR(5) DEFAULT 'short' CHECK (second_year_format IN ('short', 'full'));

COMMENT ON COLUMN custom_years.year_separator IS 'Separator between years in labels (- or /), e.g., FY2024-25 vs FY2024/25';
COMMENT ON COLUMN custom_years.second_year_format IS 'Format for second year: short (25) or full (2025)';
