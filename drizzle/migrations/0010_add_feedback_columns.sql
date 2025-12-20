-- Migration: Add feedback columns to analysis_results
-- ====================================================
-- 
-- Ajoute les colonnes pour stocker le feedback sur le résultat du segment précédent
-- Ces colonnes sont stockées dans le segment précédent (pas celui qu'on génère)

-- Add is_result_correct column (boolean, nullable)
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS is_result_correct BOOLEAN;

-- Add result_interval column (real/float, nullable)
-- Intervalle de temps en minutes pour que le résultat se réalise
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS result_interval REAL;

