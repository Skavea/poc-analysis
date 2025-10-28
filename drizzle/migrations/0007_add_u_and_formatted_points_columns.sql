-- Migration: Add u column, formatted points columns, and black_points_count to analysis_results
-- ===============================================================================================

-- Add u column (float)
ALTER TABLE analysis_results 
ADD COLUMN u REAL;

-- Add formatted points columns (text)
ALTER TABLE analysis_results 
ADD COLUMN red_points_formatted TEXT,
ADD COLUMN green_points_formatted TEXT;

-- Add black_points_count column (integer)
-- Nombre de points noirs = nombre de variations strictes + 1
ALTER TABLE analysis_results 
ADD COLUMN black_points_count INTEGER;
