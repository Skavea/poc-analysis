-- Migration: Increase symbol column length from 10 to 20 characters
-- ================================================================

-- Update stock_data table
ALTER TABLE stock_data 
ALTER COLUMN symbol TYPE varchar(20);

-- Update analysis_results table  
ALTER TABLE analysis_results 
ALTER COLUMN symbol TYPE varchar(20);
