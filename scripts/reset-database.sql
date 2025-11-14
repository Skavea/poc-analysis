-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (cascade pour supprimer les tables liées)
DROP TABLE IF EXISTS analysis_results_images CASCADE;
DROP TABLE IF EXISTS chart_images CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS stock_data CASCADE;

-- Table: stock_data (avec market_type et id)
CREATE TABLE stock_data (
    id VARCHAR(255) PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date VARCHAR(10) NOT NULL,
    data JSONB NOT NULL,
    total_points INTEGER NOT NULL,
    market_type VARCHAR(20) DEFAULT 'STOCK' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT positive_total_points CHECK (total_points > 0),
    CONSTRAINT stock_data_market_type_check CHECK (market_type IN ('STOCK', 'CRYPTOCURRENCY', 'COMMODITY', 'INDEX')),
    CONSTRAINT stock_data_symbol_market_date_unique UNIQUE (symbol, market_type, date)
);

-- Table: analysis_results (avec stock_data_id et pattern_point)
CREATE TABLE analysis_results (
    id VARCHAR(255) PRIMARY KEY,
    stock_data_id VARCHAR(255) NOT NULL REFERENCES stock_data(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    date VARCHAR(10) NOT NULL,
    segment_start TIMESTAMP WITH TIME ZONE NOT NULL,
    segment_end TIMESTAMP WITH TIME ZONE NOT NULL,
    point_count INTEGER NOT NULL,
    x0 DECIMAL(12,4) NOT NULL,
    min_price DECIMAL(12,4) NOT NULL,
    max_price DECIMAL(12,4) NOT NULL,
    average_price DECIMAL(12,4) NOT NULL,
    trend_direction VARCHAR(10) NOT NULL CHECK (trend_direction IN ('UP', 'DOWN')),
    schema_type VARCHAR(20) DEFAULT 'UNCLASSIFIED' NOT NULL CHECK (schema_type IN ('R', 'V', 'UNCLASSIFIED')),
    pattern_point VARCHAR(255),
    points_data JSONB,
    original_point_count INTEGER,
    points_in_region INTEGER,
    invalid BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT valid_segment_time CHECK (segment_start < segment_end),
    CONSTRAINT valid_point_count CHECK (point_count >= 6),
    CONSTRAINT valid_prices CHECK (min_price <= average_price AND average_price <= max_price)
);

-- Table: chart_images (pour stocker les graphiques SVG)
CREATE TABLE chart_images (
    id VARCHAR(255) PRIMARY KEY,
    segment_id VARCHAR(255) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    svg_content TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'svg',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: analysis_results_images (pour stocker les images base64)
CREATE TABLE analysis_results_images (
    id VARCHAR(255) PRIMARY KEY UNIQUE,
    analysis_result_id VARCHAR(255) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    img_data TEXT NOT NULL
);

-- Indexes pour optimiser les performances
CREATE INDEX idx_stock_data_symbol ON stock_data(symbol);
CREATE INDEX idx_stock_data_date ON stock_data(date);
CREATE INDEX idx_stock_data_created_at ON stock_data(created_at);
CREATE INDEX idx_stock_data_market_type ON stock_data(market_type);
CREATE INDEX idx_stock_data_symbol_market ON stock_data(symbol, market_type);

CREATE INDEX idx_analysis_results_symbol ON analysis_results(symbol);
CREATE INDEX idx_analysis_results_date ON analysis_results(date);
CREATE INDEX idx_analysis_results_trend ON analysis_results(trend_direction);
CREATE INDEX idx_analysis_results_schema_type ON analysis_results(schema_type);
CREATE INDEX idx_analysis_results_stock_data_id ON analysis_results(stock_data_id);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at);
CREATE INDEX idx_analysis_results_invalid ON analysis_results(invalid);
