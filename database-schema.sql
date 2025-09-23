-- =====================================================
-- STOCK ANALYSIS DATABASE SCHEMA
-- =====================================================
-- 
-- Complete schema for 3-page flow
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Table: stock_data
-- Purpose: Store raw stock data from API
CREATE TABLE stock_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    data JSONB NOT NULL, -- Raw API data
    total_points INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_total_points CHECK (total_points > 0),
    UNIQUE(symbol, date)
);

-- Table: analysis_results
-- Purpose: Store analysis results for each segment
CREATE TABLE analysis_results (
    id VARCHAR(50) PRIMARY KEY, -- Custom ID from analysis
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    segment_start TIMESTAMP NOT NULL,
    segment_end TIMESTAMP NOT NULL,
    point_count INTEGER NOT NULL,
    x0 DECIMAL(12,4) NOT NULL,
    min_price DECIMAL(12,4) NOT NULL,
    max_price DECIMAL(12,4) NOT NULL,
    average_price DECIMAL(12,4) NOT NULL,
    trend_direction VARCHAR(10) NOT NULL CHECK (trend_direction IN ('UP', 'DOWN')),
    enhanced BOOLEAN DEFAULT FALSE,
    schema_type VARCHAR(1) CHECK (schema_type IN ('R', 'V')),
    points_data JSONB, -- Sub-dataset points data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_segment_time CHECK (segment_start < segment_end),
    CONSTRAINT valid_point_count CHECK (point_count >= 6),
    CONSTRAINT valid_prices CHECK (min_price <= average_price AND average_price <= max_price)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Stock data indexes
CREATE INDEX idx_stock_data_symbol ON stock_data(symbol);
CREATE INDEX idx_stock_data_date ON stock_data(date);
CREATE INDEX idx_stock_data_created_at ON stock_data(created_at);

-- Analysis results indexes
CREATE INDEX idx_analysis_results_symbol ON analysis_results(symbol);
CREATE INDEX idx_analysis_results_date ON analysis_results(date);
CREATE INDEX idx_analysis_results_trend ON analysis_results(trend_direction);
CREATE INDEX idx_analysis_results_enhanced ON analysis_results(enhanced);
CREATE INDEX idx_analysis_results_schema_type ON analysis_results(schema_type);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stock_data IS 'Raw stock data from ALPHA_VANTAGE API';
COMMENT ON TABLE analysis_results IS 'Analysis results for each segment';
COMMENT ON COLUMN analysis_results.x0 IS 'Last point price (most recent)';
COMMENT ON COLUMN analysis_results.trend_direction IS 'UP if x0 > average, DOWN if x0 < average';
COMMENT ON COLUMN analysis_results.enhanced IS 'Whether the segment has been enhanced by user';
COMMENT ON COLUMN analysis_results.schema_type IS 'R or V schema type selected by user';
COMMENT ON COLUMN analysis_results.points_data IS 'Sub-dataset points data as JSON';
