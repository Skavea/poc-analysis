/**
 * Sample Data Population Script
 * =============================
 * 
 * Populates database with sample analysis results for testing
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  envLines.forEach(line => {
    if (line.includes('=')) {
      const equalIndex = line.indexOf('=');
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

// Database connection
const sql = neon(process.env.DATABASE_URL!);

// Sample analysis results
const sampleData = [
  {
    id: 'analysis_AAPL_2025-09-22_sample_1',
    symbol: 'AAPL',
    date: '2025-09-22',
    segment_start: '2025-09-22 09:00:00',
    segment_end: '2025-09-22 11:00:00',
    point_count: 120,
    x0: 256.50,
    min_price: 255.20,
    max_price: 257.80,
    average_price: 256.50,
    trend_direction: 'UP',
    created_at: new Date().toISOString()
  },
  {
    id: 'analysis_AAPL_2025-09-22_sample_2',
    symbol: 'AAPL',
    date: '2025-09-22',
    segment_start: '2025-09-22 11:00:00',
    segment_end: '2025-09-22 13:00:00',
    point_count: 120,
    x0: 254.80,
    min_price: 253.50,
    max_price: 256.20,
    average_price: 254.85,
    trend_direction: 'DOWN',
    created_at: new Date().toISOString()
  },
  {
    id: 'analysis_AAPL_2025-09-22_sample_3',
    symbol: 'AAPL',
    date: '2025-09-22',
    segment_start: '2025-09-22 13:00:00',
    segment_end: '2025-09-22 15:00:00',
    point_count: 120,
    x0: 258.20,
    min_price: 256.80,
    max_price: 259.50,
    average_price: 258.15,
    trend_direction: 'UP',
    created_at: new Date().toISOString()
  },
  {
    id: 'analysis_GOOGL_2025-09-22_sample_1',
    symbol: 'GOOGL',
    date: '2025-09-22',
    segment_start: '2025-09-22 09:00:00',
    segment_end: '2025-09-22 11:00:00',
    point_count: 120,
    x0: 142.50,
    min_price: 141.20,
    max_price: 143.80,
    average_price: 142.50,
    trend_direction: 'UP',
    created_at: new Date().toISOString()
  },
  {
    id: 'analysis_GOOGL_2025-09-22_sample_2',
    symbol: 'GOOGL',
    date: '2025-09-22',
    segment_start: '2025-09-22 11:00:00',
    segment_end: '2025-09-22 13:00:00',
    point_count: 120,
    x0: 140.80,
    min_price: 139.50,
    max_price: 142.20,
    average_price: 140.85,
    trend_direction: 'DOWN',
    created_at: new Date().toISOString()
  },
  {
    id: 'analysis_MSFT_2025-09-22_sample_1',
    symbol: 'MSFT',
    date: '2025-09-22',
    segment_start: '2025-09-22 09:00:00',
    segment_end: '2025-09-22 11:00:00',
    point_count: 120,
    x0: 425.50,
    min_price: 424.20,
    max_price: 426.80,
    average_price: 425.50,
    trend_direction: 'UP',
    created_at: new Date().toISOString()
  },
  {
    id: 'analysis_MSFT_2025-09-22_sample_2',
    symbol: 'MSFT',
    date: '2025-09-22',
    segment_start: '2025-09-22 11:00:00',
    segment_end: '2025-09-22 13:00:00',
    point_count: 120,
    x0: 423.80,
    min_price: 422.50,
    max_price: 425.20,
    average_price: 423.85,
    trend_direction: 'DOWN',
    created_at: new Date().toISOString()
  }
];

async function populateSampleData() {
  console.log('🚀 Populating database with sample data...');
  
  try {
    // Clear existing data
    await sql`DELETE FROM analysis_results`;
    console.log('✅ Cleared existing data');
    
    // Insert sample data
    for (const data of sampleData) {
      await sql`
        INSERT INTO analysis_results (
          id, symbol, date, segment_start, segment_end, point_count,
          x0, min_price, max_price, average_price, trend_direction, created_at
        ) VALUES (
          ${data.id},
          ${data.symbol},
          ${data.date},
          ${data.segment_start},
          ${data.segment_end},
          ${data.point_count},
          ${data.x0},
          ${data.min_price},
          ${data.max_price},
          ${data.average_price},
          ${data.trend_direction},
          ${data.created_at}
        )
      `;
    }
    
    console.log(`✅ Inserted ${sampleData.length} sample records`);
    
    // Get statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_segments,
        COUNT(CASE WHEN trend_direction = 'UP' THEN 1 END) as up_trends,
        COUNT(CASE WHEN trend_direction = 'DOWN' THEN 1 END) as down_trends,
        COUNT(DISTINCT symbol) as symbols
      FROM analysis_results
    `;
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Total segments: ${stats[0].total_segments}`);
    console.log(`   Up trends: ${stats[0].up_trends}`);
    console.log(`   Down trends: ${stats[0].down_trends}`);
    console.log(`   Symbols: ${stats[0].symbols}`);
    
    console.log('\n🎉 Sample data population completed!');
    console.log('   You can now run: npm run dev');
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  populateSampleData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sample data population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateSampleData };