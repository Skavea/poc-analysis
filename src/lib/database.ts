/**
 * Database Connection
 * ===================
 * 
 * Neon SQL database connection and queries
 */

import { neon } from '@neondatabase/serverless';

// Database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(databaseUrl);

// Types
export interface StockData {
  id: string;
  symbol: string;
  date: string;
  data: any;
  total_points: number;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  symbol: string;
  date: string;
  segment_start: string;
  segment_end: string;
  point_count: number;
  x0: number;
  min_price: number;
  max_price: number;
  average_price: number;
  trend_direction: 'UP' | 'DOWN';
  enhanced: boolean;
  schema_type: 'R' | 'V' | null;
  created_at: string;
}

// Database queries
export class DatabaseService {
  /**
   * Get all stock datasets
   */
  static async getStockDatasets(): Promise<StockData[]> {
    const results = await sql`
      SELECT * FROM stock_data 
      ORDER BY created_at DESC
    `;
    return results as StockData[];
  }

  /**
   * Get stock dataset by symbol
   */
  static async getStockDataset(symbol: string): Promise<StockData | null> {
    const results = await sql`
      SELECT * FROM stock_data 
      WHERE symbol = ${symbol.toUpperCase()}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return results[0] as StockData || null;
  }

  /**
   * Save stock dataset
   */
  static async saveStockDataset(data: {
    symbol: string;
    date: string;
    data: any;
    total_points: number;
  }): Promise<void> {
    await sql`
      INSERT INTO stock_data (symbol, date, data, total_points)
      VALUES (${data.symbol}, ${data.date}, ${JSON.stringify(data.data)}, ${data.total_points})
      ON CONFLICT (symbol, date) DO UPDATE SET
        data = EXCLUDED.data,
        total_points = EXCLUDED.total_points,
        created_at = CURRENT_TIMESTAMP
    `;
  }

  /**
   * Get all analysis results for a symbol
   */
  static async getAnalysisResults(symbol: string): Promise<AnalysisResult[]> {
    const results = await sql`
      SELECT * FROM analysis_results 
      WHERE symbol = ${symbol.toUpperCase()}
      ORDER BY enhanced DESC, created_at DESC
    `;
    return results as AnalysisResult[];
  }

  /**
   * Get all analysis results
   */
  static async getAllAnalysisResults(): Promise<AnalysisResult[]> {
    const results = await sql`
      SELECT * FROM analysis_results 
      ORDER BY enhanced DESC, created_at DESC
    `;
    return results as AnalysisResult[];
  }

  /**
   * Get analysis results by date range
   */
  static async getAnalysisResultsByDateRange(
    symbol: string, 
    startDate: string, 
    endDate: string
  ): Promise<AnalysisResult[]> {
    const results = await sql`
      SELECT * FROM analysis_results 
      WHERE symbol = ${symbol.toUpperCase()}
        AND date >= ${startDate}
        AND date <= ${endDate}
      ORDER BY enhanced DESC, created_at DESC
    `;
    return results as AnalysisResult[];
  }

  /**
   * Save analysis result
   */
  static async saveAnalysisResult(data: {
    id: string;
    symbol: string;
    date: string;
    segment_start: string;
    segment_end: string;
    point_count: number;
    x0: number;
    min_price: number;
    max_price: number;
    average_price: number;
    trend_direction: 'UP' | 'DOWN';
    points_data: any;
  }): Promise<void> {
    await sql`
      INSERT INTO analysis_results (
        id, symbol, date, segment_start, segment_end, point_count,
        x0, min_price, max_price, average_price, trend_direction, points_data
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
        ${JSON.stringify(data.points_data)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  /**
   * Update analysis result enhancement
   */
  static async updateAnalysisEnhancement(
    id: string, 
    enhanced: boolean, 
    schema_type: 'R' | 'V' | null = null
  ): Promise<void> {
    await sql`
      UPDATE analysis_results 
      SET enhanced = ${enhanced}, schema_type = ${schema_type}
      WHERE id = ${id}
    `;
  }

  /**
   * Get analysis statistics
   */
  static async getAnalysisStats(): Promise<{
    totalSegments: number;
    upTrends: number;
    downTrends: number;
    enhancedSegments: number;
    symbols: string[];
  }> {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_segments,
        COUNT(CASE WHEN trend_direction = 'UP' THEN 1 END) as up_trends,
        COUNT(CASE WHEN trend_direction = 'DOWN' THEN 1 END) as down_trends,
        COUNT(CASE WHEN enhanced = true THEN 1 END) as enhanced_segments,
        ARRAY_AGG(DISTINCT symbol) as symbols
      FROM analysis_results
    `;
    
    return {
      totalSegments: Number(stats[0].total_segments),
      upTrends: Number(stats[0].up_trends),
      downTrends: Number(stats[0].down_trends),
      enhancedSegments: Number(stats[0].enhanced_segments),
      symbols: stats[0].symbols || []
    };
  }

  /**
   * Get segment data for visualization
   */
  static async getSegmentData(segmentId: string): Promise<{
    analysis: AnalysisResult;
    chartData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  } | null> {
    // Decode URL-encoded segment ID
    const decodedSegmentId = decodeURIComponent(segmentId);
    
    // Get analysis result
    const analysis = await sql`
      SELECT * FROM analysis_results 
      WHERE id = ${decodedSegmentId}
    `;
    
    if (!analysis[0]) {
      return null;
    }

    // Use the points_data from the analysis result
    const chartData = analysis[0].points_data || [];

    return {
      analysis: analysis[0] as AnalysisResult,
      chartData
    };
  }
}