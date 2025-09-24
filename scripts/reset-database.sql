-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables
DROP TABLE IF EXISTS analysis_results;
DROP TABLE IF EXISTS stock_data;

-- Table: stock_data
CREATE TABLE stock_data (
    id VARCHAR(255) PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date VARCHAR(10) NOT NULL,
    data JSONB NOT NULL,
    total_points INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT positive_total_points CHECK (total_points > 0),
    UNIQUE(symbol, date)
);

-- Table: analysis_results
CREATE TABLE analysis_results (
    id VARCHAR(255) PRIMARY KEY,
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
    points_data JSONB,
    original_point_count INTEGER,
    points_in_region INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT valid_segment_time CHECK (segment_start < segment_end),
    CONSTRAINT valid_point_count CHECK (point_count >= 6),
    CONSTRAINT valid_prices CHECK (min_price <= average_price AND average_price <= max_price)
);

-- Indexes
CREATE INDEX idx_stock_data_symbol ON stock_data(symbol);
CREATE INDEX idx_stock_data_date ON stock_data(date);
CREATE INDEX idx_stock_data_created_at ON stock_data(created_at);

CREATE INDEX idx_analysis_results_symbol ON analysis_results(symbol);
CREATE INDEX idx_analysis_results_date ON analysis_results(date);
CREATE INDEX idx_analysis_results_trend ON analysis_results(trend_direction);
CREATE INDEX idx_analysis_results_schema_type ON analysis_results(schema_type);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at);
