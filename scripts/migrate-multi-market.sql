-- =====================================================
-- MIGRATION MULTI-MARCHÉS POUR BASE NEON
-- =====================================================
-- 
-- Extension du système pour supporter les cryptomonnaies,
-- matières premières, indices et actions avec relations
-- =====================================================

-- 1. Ajouter market_type à stock_data uniquement
ALTER TABLE stock_data 
ADD COLUMN market_type VARCHAR(20) DEFAULT 'STOCK' NOT NULL;

-- 2. Mettre à jour les données existantes
UPDATE stock_data SET market_type = 'STOCK' WHERE market_type IS NULL;

-- 3. Ajouter la contrainte pour stock_data
ALTER TABLE stock_data 
ADD CONSTRAINT stock_data_market_type_check 
CHECK (market_type IN ('STOCK', 'CRYPTOCURRENCY', 'COMMODITY', 'INDEX'));

-- 4. Ajouter la colonne stock_data_id à analysis_results
ALTER TABLE analysis_results 
ADD COLUMN stock_data_id VARCHAR(255);

-- 5. Remplir stock_data_id pour les données existantes
-- En utilisant la correspondance symbol + date
UPDATE analysis_results 
SET stock_data_id = stock_data.id
FROM stock_data 
WHERE analysis_results.symbol = stock_data.symbol 
  AND analysis_results.date = stock_data.date;

-- 6. Vérifier que toutes les références sont correctes
SELECT 
    ar.symbol,
    ar.date,
    ar.stock_data_id,
    sd.id as actual_stock_data_id,
    CASE 
        WHEN ar.stock_data_id = sd.id THEN 'OK'
        ELSE 'ERREUR'
    END as status
FROM analysis_results ar
LEFT JOIN stock_data sd ON ar.symbol = sd.symbol AND ar.date = sd.date
WHERE ar.stock_data_id IS NULL OR ar.stock_data_id != sd.id;

-- 7. Ajouter la contrainte NOT NULL après vérification
ALTER TABLE analysis_results 
ALTER COLUMN stock_data_id SET NOT NULL;

-- 8. Ajouter la clé étrangère
ALTER TABLE analysis_results 
ADD CONSTRAINT fk_analysis_results_stock_data 
FOREIGN KEY (stock_data_id) REFERENCES stock_data(id) ON DELETE CASCADE;

-- 9. Créer les index pour optimiser les performances
CREATE INDEX idx_stock_data_market_type ON stock_data(market_type);
CREATE INDEX idx_analysis_results_stock_data_id ON analysis_results(stock_data_id);
CREATE INDEX idx_stock_data_symbol_market ON stock_data(symbol, market_type);
CREATE INDEX idx_analysis_results_symbol ON analysis_results(symbol);
CREATE INDEX idx_analysis_results_date ON analysis_results(date);

-- 10. Mettre à jour la contrainte unique de stock_data
ALTER TABLE stock_data DROP CONSTRAINT IF EXISTS stock_data_symbol_date_key;
ALTER TABLE stock_data 
ADD CONSTRAINT stock_data_symbol_market_date_unique 
UNIQUE (symbol, market_type, date);

-- 11. Ajouter des commentaires
COMMENT ON COLUMN stock_data.market_type IS 'Type de marché: STOCK, CRYPTOCURRENCY, COMMODITY, INDEX';
COMMENT ON COLUMN analysis_results.stock_data_id IS 'Référence vers stock_data.id pour lier les analyses aux données sources';
COMMENT ON COLUMN analysis_results.symbol IS 'Symbole de l\'actif (dupliqué pour performance des requêtes)';
COMMENT ON COLUMN analysis_results.date IS 'Date de l\'analyse (dupliquée pour performance des requêtes)';

-- 12. Vérification finale
SELECT 
    'Migration terminée avec succès' as status,
    COUNT(*) as total_stock_records,
    COUNT(DISTINCT market_type) as market_types_count
FROM stock_data;

SELECT 
    'Analysis Results' as table_name,
    COUNT(*) as total_analysis_records,
    COUNT(DISTINCT symbol) as unique_symbols
FROM analysis_results;
