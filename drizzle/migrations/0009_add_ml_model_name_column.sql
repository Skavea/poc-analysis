-- Migration: Add ml_model_name column to analysis_results
-- ==================================================================
-- Cette colonne stocke le nom du fichier du modèle IA utilisé pour la classification
-- (ex: "model.json", "defaultModel.ts", "customModel.ts")

ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS ml_model_name VARCHAR(255);


