-- Migration: Add pattern_point column to analysis_results table
-- This column will store the timestamp of the selected pattern point
-- NULL means no pattern was selected, timestamp means a specific point was selected

ALTER TABLE analysis_results 
ADD COLUMN pattern_point VARCHAR(255);

-- Add a comment to explain the column
COMMENT ON COLUMN analysis_results.pattern_point IS 'Timestamp of the selected pattern point. NULL if no pattern selected, timestamp if pattern point was selected.';
