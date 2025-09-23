/**
 * Database Population Script
 * ==========================
 * 
 * Populates the database with sample data from the stock analysis system
 */

import { neon } from '@neondatabase/serverless';
import { stockSystem } from '../StockSystem';

// Database connection
const sql = neon(process.env.DATABASE_URL!);

async function populateDatabase() {
  console.log('🚀 Starting database population...');
  
  try {
    // Process AAPL stock
    console.log('\n📊 Processing AAPL...');
    const aaplResults = await stockSystem.processStock('AAPL', true);
    
    if (aaplResults.length > 0) {
      console.log(`✅ Processed ${aaplResults.length} segments for AAPL`);
      
      // Store in database
      for (const result of aaplResults) {
        await sql`
          INSERT INTO analysis_results (
            id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, created_at
          ) VALUES (
            ${result.id},
            ${result.symbol},
            ${result.date},
            ${result.segmentStart},
            ${result.segmentEnd},
            ${result.pointCount},
            ${result.x0},
            ${result.minPrice},
            ${result.maxPrice},
            ${result.averagePrice},
            ${result.trendDirection},
            ${new Date(result.createdAt).toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
    
    // Process GOOGL stock
    console.log('\n📊 Processing GOOGL...');
    const googlResults = await stockSystem.processStock('GOOGL', true);
    
    if (googlResults.length > 0) {
      console.log(`✅ Processed ${googlResults.length} segments for GOOGL`);
      
      // Store in database
      for (const result of googlResults) {
        await sql`
          INSERT INTO analysis_results (
            id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, created_at
          ) VALUES (
            ${result.id},
            ${result.symbol},
            ${result.date},
            ${result.segmentStart},
            ${result.segmentEnd},
            ${result.pointCount},
            ${result.x0},
            ${result.minPrice},
            ${result.maxPrice},
            ${result.averagePrice},
            ${result.trendDirection},
            ${new Date(result.createdAt).toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
    
    // Process MSFT stock
    console.log('\n📊 Processing MSFT...');
    const msftResults = await stockSystem.processStock('MSFT', true);
    
    if (msftResults.length > 0) {
      console.log(`✅ Processed ${msftResults.length} segments for MSFT`);
      
      // Store in database
      for (const result of msftResults) {
        await sql`
          INSERT INTO analysis_results (
            id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, created_at
          ) VALUES (
            ${result.id},
            ${result.symbol},
            ${result.date},
            ${result.segmentStart},
            ${result.segmentEnd},
            ${result.pointCount},
            ${result.x0},
            ${result.minPrice},
            ${result.maxPrice},
            ${result.averagePrice},
            ${result.trendDirection},
            ${new Date(result.createdAt).toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
    
    // Get final statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_segments,
        COUNT(CASE WHEN trend_direction = 'UP' THEN 1 END) as up_trends,
        COUNT(CASE WHEN trend_direction = 'DOWN' THEN 1 END) as down_trends,
        COUNT(DISTINCT symbol) as symbols
      FROM analysis_results
    `;
    
    console.log('\n📈 Database Population Complete!');
    console.log(`   Total segments: ${stats[0].total_segments}`);
    console.log(`   Up trends: ${stats[0].up_trends}`);
    console.log(`   Down trends: ${stats[0].down_trends}`);
    console.log(`   Symbols: ${stats[0].symbols}`);
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  populateDatabase()
    .then(() => {
      console.log('\n🎉 Database population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database population failed:', error);
      process.exit(1);
    });
}

export { populateDatabase };

