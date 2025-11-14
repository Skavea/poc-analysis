-- =====================================================
-- MIGRATION : Ajout de la colonne 'invalid' à analysis_results
-- =====================================================
-- 
-- Cette migration ajoute une colonne 'invalid' (boolean) à la table
-- analysis_results pour indiquer si un segment a une séquence continue
-- de points d'une minute (60 secondes).
-- 
-- Par défaut, invalid = false (segment valide)
-- =====================================================

-- Ajouter la colonne invalid avec valeur par défaut false
ALTER TABLE analysis_results 
ADD COLUMN IF NOT EXISTS invalid BOOLEAN DEFAULT false NOT NULL;

-- Créer un index pour optimiser les requêtes filtrant par invalid
CREATE INDEX IF NOT EXISTS idx_analysis_results_invalid ON analysis_results(invalid);

-- Commentaire sur la colonne
COMMENT ON COLUMN analysis_results.invalid IS 'Indique si le segment a une séquence continue de points d''une minute (60 secondes). false = valide, true = invalide';

