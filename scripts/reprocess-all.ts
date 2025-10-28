/**
 * Reprocess All Stocks
 * ===================
 * 
 * This script reprocesses all existing stock data using the updated analysis logic
 */

import { StockAnalysisService } from '../src/lib/stockAnalysisService';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

async function reprocessAllStocks() {
  try {
    console.log('🔍 Finding all stocks in the database...');
    
    // Get all unique stock symbols
    const stocks = await sql`
      SELECT DISTINCT symbol FROM stock_data
    `;
    
    if (stocks.length === 0) {
      console.log('No stocks found in the database.');
      return;
    }
    
    console.log(`Found ${stocks.length} stocks: ${stocks.map((s: any) => s.symbol).join(', ')}`);
    
    // Process each stock
    for (const stock of stocks) {
      const symbol = stock.symbol;
      console.log(`\n🔄 Reprocessing ${symbol}...`);
      
      // Get stock data
      const stockData = await sql`
        SELECT * FROM stock_data 
        WHERE symbol = ${symbol}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      if (!stockData[0]) {
        console.error(`❌ No stock data found for ${symbol}`);
        continue;
      }
      
      console.log(`✅ Found stock data for ${symbol} with ${stockData[0].total_points} points`);
      
      // Clear existing analysis results for this symbol
      console.log(`🗑️ Clearing existing analysis results for ${symbol}...`);
      await sql`
        DELETE FROM analysis_results 
        WHERE symbol = ${symbol}
      `;
      
      // Reprocess with the updated logic
      console.log(`🔄 Reprocessing with updated logic...`);
      const service = new StockAnalysisService();
      
      // Extract segments with the new logic
      const segments = service.extractSegments(symbol, stockData[0].data);
      
      // Save the new analysis results
      const savedCount = await service.saveAnalysisResults(segments, stockData[0].id);
      
      console.log(`✅ Reprocessing complete! Created ${savedCount} segments for ${symbol}`);
      
      // Show segment statistics
      const stats = await sql`
        SELECT 
          COUNT(*) as total,
          AVG(point_count) as avg_points,
          MIN(point_count) as min_points,
          MAX(point_count) as max_points,
          AVG(points_in_region) as avg_points_in_region,
          MIN(points_in_region) as min_points_in_region,
          MAX(points_in_region) as max_points_in_region,
          COUNT(CASE WHEN points_in_region > 21 THEN 1 END) as segments_with_too_many_points,
          COUNT(CASE WHEN points_in_region < 6 THEN 1 END) as segments_with_too_few_points
        FROM analysis_results
        WHERE symbol = ${symbol}
      `;
      
      console.log('\n📊 Segment Statistics:');
      console.log(`- Total segments: ${stats[0].total}`);
      console.log(`- Average points per segment: ${Math.round(stats[0].avg_points)}`);
      console.log(`- Min points: ${stats[0].min_points}`);
      console.log(`- Max points: ${stats[0].max_points}`);
      console.log(`- Average points in region: ${Math.round(stats[0].avg_points_in_region)}`);
      console.log(`- Min points in region: ${stats[0].min_points_in_region}`);
      console.log(`- Max points in region: ${stats[0].max_points_in_region}`);
      console.log(`- Segments with too many points (>21): ${stats[0].segments_with_too_many_points}`);
      console.log(`- Segments with too few points (<6): ${stats[0].segments_with_too_few_points}`);
    }
    
    console.log('\n🎉 All stocks reprocessed successfully!');
    
  } catch (error) {
    console.error('❌ Error reprocessing stocks:', error);
  }
}

reprocessAllStocks();
