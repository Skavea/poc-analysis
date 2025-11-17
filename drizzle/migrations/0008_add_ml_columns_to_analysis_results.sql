-- Migration: Add ML classification columns to analysis_results
-- ==================================================================

-- 1) Add ml_classed (bool, NOT NULL, DEFAULT false)
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS ml_classed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Add ml_result (varchar(20), NOT NULL, DEFAULT 'UNCLASSIFIED')
--    Do not add a check constraint to keep flexibility vs schema_type's constraint.
ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS ml_result VARCHAR(20) NOT NULL DEFAULT 'UNCLASSIFIED';


