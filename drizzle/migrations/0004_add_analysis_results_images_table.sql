-- Migration: Ajout de la table analysis_results_images
-- Description: Table pour stocker les images base64 des graphiques de segments
-- Note: Correspond exactement à la structure définie par l'utilisateur

CREATE TABLE IF NOT EXISTS "analysis_results_images" (
  "id" varchar(255) PRIMARY KEY UNIQUE NOT NULL,
  "analysis_result_id" varchar(255) NOT NULL,
  "img_data" text NOT NULL
);

-- Ajouter la contrainte de clé étrangère
ALTER TABLE "analysis_results_images"
ADD CONSTRAINT "ref_analysis_results" 
FOREIGN KEY ("analysis_result_id") REFERENCES "analysis_results"("id") ON DELETE CASCADE;

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS "idx_analysis_results_images_analysis_result_id" 
ON "analysis_results_images"("analysis_result_id");

