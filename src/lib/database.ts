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
  data: Record<string, unknown>;
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
  schema_type: 'R' | 'V' | 'UNCLASSIFIED';
  points_data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
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
   * Génère automatiquement l'id à partir du symbol et de la date
   */
  static async saveStockDataset(data: {
    symbol: string;
    date: string;
    data: Record<string, unknown>;
    total_points: number;
    market_type?: 'STOCK' | 'CRYPTOCURRENCY' | 'COMMODITY' | 'INDEX';
  }): Promise<void> {
    // Générer l'id au format "SYMBOL_DATE"
    const id = `${data.symbol.toUpperCase()}_${data.date}`;
    const marketType = data.market_type || 'STOCK';
    
    await sql`
      INSERT INTO stock_data (id, symbol, date, data, total_points, market_type)
      VALUES (
        ${id}, 
        ${data.symbol.toUpperCase()}, 
        ${data.date}, 
        ${JSON.stringify(data.data)}, 
        ${data.total_points}, 
        ${marketType}
      )
      ON CONFLICT (id) DO UPDATE SET
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
      ORDER BY schema_type DESC, created_at DESC
    `;
    return results as AnalysisResult[];
  }

  /**
   * Get all analysis results
   */
  static async getAllAnalysisResults(): Promise<AnalysisResult[]> {
    const results = await sql`
      SELECT * FROM analysis_results 
      ORDER BY schema_type DESC, created_at DESC
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
      ORDER BY schema_type DESC, created_at DESC
    `;
    return results as AnalysisResult[];
  }

  /**
   * Save analysis result
   * Construit automatiquement le stock_data_id à partir du symbol et de la date
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
    points_data: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  }): Promise<void> {
    // Construire le stockDataId à partir du symbol et date
    // S'assure que le symbol est en majuscules pour correspondre à l'id de stock_data
    const stockDataId = `${data.symbol.toUpperCase()}_${data.date}`;
    
    await sql`
      INSERT INTO analysis_results (
        id, stock_data_id, symbol, date, segment_start, segment_end, point_count,
        x0, min_price, max_price, average_price, trend_direction, points_data, schema_type
      ) VALUES (
        ${data.id},
        ${stockDataId},
        ${data.symbol.toUpperCase()},
        ${data.date},
        ${data.segment_start},
        ${data.segment_end},
        ${data.point_count},
        ${data.x0},
        ${data.min_price},
        ${data.max_price},
        ${data.average_price},
        ${data.trend_direction},
        ${JSON.stringify(data.points_data)},
        'UNCLASSIFIED'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  /**
   * Update analysis result schema type
   */
  static async updateAnalysisSchema(
    id: string, 
    schema_type: 'R' | 'V' | 'UNCLASSIFIED'
  ): Promise<void> {
    await sql`
      UPDATE analysis_results 
      SET schema_type = ${schema_type}
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
    rSchemas: number;
    vSchemas: number;
    unclassifiedSchemas: number;
    symbols: string[];
  }> {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_segments,
        COUNT(CASE WHEN trend_direction = 'UP' THEN 1 END) as up_trends,
        COUNT(CASE WHEN trend_direction = 'DOWN' THEN 1 END) as down_trends,
        COUNT(CASE WHEN schema_type = 'R' THEN 1 END) as r_schemas,
        COUNT(CASE WHEN schema_type = 'V' THEN 1 END) as v_schemas,
        COUNT(CASE WHEN schema_type = 'UNCLASSIFIED' THEN 1 END) as unclassified_schemas,
        ARRAY_AGG(DISTINCT symbol) as symbols
      FROM analysis_results
    `;
    
    return {
      totalSegments: Number(stats[0].total_segments),
      upTrends: Number(stats[0].up_trends),
      downTrends: Number(stats[0].down_trends),
      rSchemas: Number(stats[0].r_schemas),
      vSchemas: Number(stats[0].v_schemas),
      unclassifiedSchemas: Number(stats[0].unclassified_schemas),
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