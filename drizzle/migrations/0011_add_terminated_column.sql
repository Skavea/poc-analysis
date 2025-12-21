-- Migration: Add terminated column to stock_data
-- Description: Add a boolean column to track if a stream (stock_data) is fully processed

ALTER TABLE stock_data
ADD COLUMN IF NOT EXISTS terminated BOOLEAN DEFAULT FALSE NOT NULL;

-- Set all existing streams to terminated=true (they were created before this feature)
UPDATE stock_data
SET terminated = TRUE
WHERE terminated = FALSE;

