/**
 * Stock Analysis Service
 * ======================
 * 
 * External service for fetching stock data and running analysis
 * Can be called from the website to add new stocks and run analysis
 */

import { neon } from '@neondatabase/serverless';

// Database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(databaseUrl);

export class StockAnalysisService {
  private static instance: StockAnalysisService;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY environment variable is required');
    }
  }

  static getInstance(): StockAnalysisService {
    if (!StockAnalysisService.instance) {
      StockAnalysisService.instance = new StockAnalysisService();
    }
    return StockAnalysisService.instance;
  }

  /**
   * Fetch stock data from Alpha Vantage API
   */
  async fetchStockData(symbol: string): Promise<any> {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputsize=full&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      if (data.Note) {
        throw new Error(data.Note);
      }

      const timeSeries = data['Time Series (1min)'];
      if (!timeSeries) {
        throw new Error('No time series data found');
      }

      return timeSeries;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      throw error;
    }
  }

  /**
   * Save stock data to database
   */
  async saveStockData(symbol: string, data: any): Promise<void> {
    const totalPoints = Object.keys(data).length;
    const date = new Date().toISOString().split('T')[0];

    await sql`
      INSERT INTO stock_data (symbol, date, data, total_points)
      VALUES (${symbol.toUpperCase()}, ${date}, ${JSON.stringify(data)}, ${totalPoints})
      ON CONFLICT (symbol, date) DO UPDATE SET
        data = EXCLUDED.data,
        total_points = EXCLUDED.total_points,
        created_at = CURRENT_TIMESTAMP
    `;
  }

  /**
   * Extract segments from stock data
   */
  extractSegments(symbol: string, data: any): Array<{
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
  }> {
    const segments = [];
    const timestamps = Object.keys(data).sort();
    
    // Group by trading days
    const tradingDays = this.groupByTradingDays(timestamps);
    
    for (const [date, dayTimestamps] of Object.entries(tradingDays)) {
      // Extract 2-hour segments (120 minutes each)
      const segmentsForDay = this.extractSegmentsForDay(symbol, date, dayTimestamps, data);
      segments.push(...segmentsForDay);
    }

    return segments;
  }

  /**
   * Group timestamps by trading days
   */
  private groupByTradingDays(timestamps: string[]): Record<string, string[]> {
    const days: Record<string, string[]> = {};
    
    for (const timestamp of timestamps) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      if (!days[date]) {
        days[date] = [];
      }
      days[date].push(timestamp);
    }

    return days;
  }

  /**
   * Extract segments for a single trading day
   */
  private extractSegmentsForDay(
    symbol: string, 
    date: string, 
    timestamps: string[], 
    data: any
  ): Array<any> {
    const segments = [];
    const segmentDuration = 120; // 2 hours in minutes
    const maxSegmentsPerDay = 6; // Maximum segments per day

    // Sort timestamps
    timestamps.sort();

    // Extract segments
    for (let i = 0; i < timestamps.length - segmentDuration; i += segmentDuration) {
      const segmentTimestamps = timestamps.slice(i, i + segmentDuration);
      
      if (segmentTimestamps.length < 6) continue; // Skip if too few points
      
      const segmentData = this.analyzeSegment(symbol, date, segmentTimestamps, data);
      if (segmentData) {
        segments.push(segmentData);
      }

      // Limit segments per day
      if (segments.length >= maxSegmentsPerDay) break;
    }

    return segments;
  }

  /**
   * Analyze a single segment
   */
  private analyzeSegment(
    symbol: string, 
    date: string, 
    timestamps: string[], 
    data: any
  ): any | null {
    if (timestamps.length < 6) return null;

    const prices = timestamps.map(ts => parseFloat(data[ts]['4. close']));
    const x0 = prices[prices.length - 1]; // Last price
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = (minPrice + maxPrice) / 2;
    const trendDirection = x0 > averagePrice ? 'UP' : 'DOWN';

    // Create segment data
    const segmentData = timestamps.map(ts => ({
      timestamp: ts,
      open: parseFloat(data[ts]['1. open']),
      high: parseFloat(data[ts]['2. high']),
      low: parseFloat(data[ts]['3. low']),
      close: parseFloat(data[ts]['4. close']),
      volume: parseFloat(data[ts]['5. volume'])
    }));

    return {
      id: `${symbol}_${date}_${timestamps[0]}_${timestamps[timestamps.length - 1]}`,
      symbol: symbol.toUpperCase(),
      date,
      segment_start: timestamps[0],
      segment_end: timestamps[timestamps.length - 1],
      point_count: timestamps.length,
      x0,
      min_price: minPrice,
      max_price: maxPrice,
      average_price: averagePrice,
      trend_direction: trendDirection,
      points_data: segmentData
    };
  }

  /**
   * Save analysis results to database
   */
  async saveAnalysisResults(segments: any[]): Promise<void> {
    for (const segment of segments) {
      await sql`
        INSERT INTO analysis_results (
          id, symbol, date, segment_start, segment_end, point_count,
          x0, min_price, max_price, average_price, trend_direction, points_data
        ) VALUES (
          ${segment.id},
          ${segment.symbol},
          ${segment.date},
          ${segment.segment_start},
          ${segment.segment_end},
          ${segment.point_count},
          ${segment.x0},
          ${segment.min_price},
          ${segment.max_price},
          ${segment.average_price},
          ${segment.trend_direction},
          ${JSON.stringify(segment.points_data)}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  /**
   * Process a stock symbol (fetch data and run analysis)
   */
  async processStock(symbol: string): Promise<{
    success: boolean;
    message: string;
    segmentsCreated: number;
  }> {
    try {
      console.log(`Processing stock: ${symbol}`);
      
      // Fetch data from API
      const stockData = await this.fetchStockData(symbol);
      
      // Save raw data
      await this.saveStockData(symbol, stockData);
      
      // Extract and analyze segments
      const segments = this.extractSegments(symbol, stockData);
      
      // Save analysis results
      await this.saveAnalysisResults(segments);
      
      return {
        success: true,
        message: `Successfully processed ${symbol}`,
        segmentsCreated: segments.length
      };
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
      return {
        success: false,
        message: `Error processing ${symbol}: ${error}`,
        segmentsCreated: 0
      };
    }
  }
}
