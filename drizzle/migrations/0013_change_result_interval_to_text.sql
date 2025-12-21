-- Migration: Change result_interval from REAL to TEXT and is_result_correct from BOOLEAN to TEXT
-- Description: Allow storing multiple interval values and correctness values as space-separated strings

-- Change the column type from REAL to TEXT
ALTER TABLE analysis_results
ALTER COLUMN result_interval TYPE TEXT USING result_interval::TEXT;

-- Change the column type from BOOLEAN to TEXT
-- Convert existing boolean values: true -> '1', false -> '0', null -> null
ALTER TABLE analysis_results
ALTER COLUMN is_result_correct TYPE TEXT USING 
  CASE 
    WHEN is_result_correct IS NULL THEN NULL
    WHEN is_result_correct = true THEN '1'
    ELSE '0'
  END;
