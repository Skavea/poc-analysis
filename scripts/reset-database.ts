/**
 * Reset Database
 * =============
 * 
 * This script resets the database by dropping and recreating all tables
 * with the correct schema for our improved analysis logic.
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = dotenv.parse(envContent);
  
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️ WARNING: This will delete all data in your database. Are you sure? (y/N) ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function resetDatabase() {
  try {
    const confirmed = await confirmReset();
    if (!confirmed) {
      console.log('❌ Database reset cancelled.');
      return;
    }

    console.log('🔄 Resetting database...');
    
    // Drop existing tables (cascade pour supprimer les tables liées)
    console.log('🗑️ Dropping existing tables...');
    await sql`DROP TABLE IF EXISTS analysis_results_images CASCADE`;
    await sql`DROP TABLE IF EXISTS chart_images CASCADE`;
    await sql`DROP TABLE IF EXISTS analysis_results CASCADE`;
    await sql`DROP TABLE IF EXISTS stock_data CASCADE`;
    
    // Create tables
    console.log('🏗️ Creating tables...');
    
    // Enable UUID extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    
    // Create stock_data table (avec market_type)
    await sql`
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
      )
    `;
    
    // Create analysis_results table (avec stock_data_id et pattern_point)
    await sql`
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        CONSTRAINT valid_segment_time CHECK (segment_start < segment_end),
        CONSTRAINT valid_point_count CHECK (point_count >= 6),
        CONSTRAINT valid_prices CHECK (min_price <= average_price AND average_price <= max_price)
      )
    `;
    
    // Create chart_images table (pour stocker les graphiques SVG)
    await sql`
      CREATE TABLE chart_images (
        id VARCHAR(255) PRIMARY KEY,
        segment_id VARCHAR(255) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
        svg_content TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        format VARCHAR(10) NOT NULL DEFAULT 'svg',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    // Create analysis_results_images table (pour stocker les images base64)
    await sql`
      CREATE TABLE analysis_results_images (
        id VARCHAR(255) PRIMARY KEY UNIQUE,
        analysis_result_id VARCHAR(255) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
        img_data TEXT NOT NULL
      )
    `;
    
    // Create indexes
    console.log('📇 Creating indexes...');
    
    // Stock data indexes
    await sql`CREATE INDEX idx_stock_data_symbol ON stock_data(symbol)`;
    await sql`CREATE INDEX idx_stock_data_date ON stock_data(date)`;
    await sql`CREATE INDEX idx_stock_data_created_at ON stock_data(created_at)`;
    await sql`CREATE INDEX idx_stock_data_market_type ON stock_data(market_type)`;
    await sql`CREATE INDEX idx_stock_data_symbol_market ON stock_data(symbol, market_type)`;
    
    // Analysis results indexes
    await sql`CREATE INDEX idx_analysis_results_symbol ON analysis_results(symbol)`;
    await sql`CREATE INDEX idx_analysis_results_date ON analysis_results(date)`;
    await sql`CREATE INDEX idx_analysis_results_trend ON analysis_results(trend_direction)`;
    await sql`CREATE INDEX idx_analysis_results_schema_type ON analysis_results(schema_type)`;
    await sql`CREATE INDEX idx_analysis_results_stock_data_id ON analysis_results(stock_data_id)`;
    await sql`CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at)`;
    
    console.log('✅ Database reset complete!');
    console.log('\nNext steps:');
    console.log('1. Run the app: npm run dev');
    console.log('2. Add stocks: Use the "Add Stock" button on the home page');
    console.log('3. View analysis: Click on a stock to see the analysis results');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  }
}

resetDatabase();