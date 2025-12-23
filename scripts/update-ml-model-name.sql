-- Script: Mettre à jour ml_model_name pour les classifications existantes
-- ====================================================================
-- Ce script met à jour toutes les entrées qui ont été classées par ML
-- pour leur attribuer le nom du modèle "first_model_1"

UPDATE analysis_results
SET ml_model_name = 'first_model_1'
WHERE ml_classed = TRUE
  AND (ml_model_name IS NULL OR ml_model_name = '');

-- Afficher le nombre d'entrées mises à jour
-- (décommentez la ligne suivante pour voir le résultat)
-- SELECT COUNT(*) as updated_count FROM analysis_results WHERE ml_model_name = 'first_model_1';




