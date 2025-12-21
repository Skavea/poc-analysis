-- Migration: Add result column to analysis_results
-- Description: Add a new column to store result values (similar to is_result_correct)

-- Add result column (TEXT, nullable)
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS result TEXT;

