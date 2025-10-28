-- Migration: Add filtered points columns to analysis_results
-- ========================================================

-- Add new columns for filtered points data
ALTER TABLE analysis_results 
ADD COLUMN filtered_points_data JSONB,
ADD COLUMN peak_points_data JSONB,
ADD COLUMN filtered_point_count INTEGER,
ADD COLUMN peak_point_count INTEGER;
