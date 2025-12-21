-- Migration: Add generation_mode column to stock_data
-- Description: Add a column to track if a stream was generated in auto or manual mode

ALTER TABLE stock_data
ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(20) DEFAULT 'auto' NOT NULL;

-- Set all existing streams to 'auto' (they were created before this feature)
UPDATE stock_data
SET generation_mode = 'auto'
WHERE generation_mode IS NULL OR generation_mode = '';

-- Add check constraint to ensure only 'auto' or 'manual' values
ALTER TABLE stock_data
ADD CONSTRAINT stock_data_generation_mode_check 
CHECK (generation_mode IN ('auto', 'manual'));

