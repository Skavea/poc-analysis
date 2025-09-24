/**
 * Stock Analysis Service
 * ======================
 * 
 * Service for fetching stock data and running analysis
 * Implements the point adjustment logic for trend analysis
 */

import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

// Database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(databaseUrl);

export class StockAnalysisService {
  private static instance: StockAnalysisService;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ALPHA_VANTAGE_API_KEY environment variable is not set');
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
      if (!this.apiKey) {
        throw new Error('ALPHA_VANTAGE_API_KEY is required');
      }
      
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
  async saveStockData(symbol: string, data: any): Promise<string> {
    const totalPoints = Object.keys(data).length;
    const date = new Date().toISOString().split('T')[0];
    const id = `${symbol.toUpperCase()}_${date}`;

    await sql`
      INSERT INTO stock_data (id, symbol, date, data, total_points)
      VALUES (${id}, ${symbol.toUpperCase()}, ${date}, ${JSON.stringify(data)}, ${totalPoints})
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        total_points = EXCLUDED.total_points,
        created_at = CURRENT_TIMESTAMP
    `;
    
    return id;
  }

  /**
   * Extract segments from stock data
   */
  extractSegments(symbol: string, data: any): Array<{
    id: string;
    symbol: string;
    date: string;
    segmentStart: string;
    segmentEnd: string;
    pointCount: number;
    x0: number;
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    trendDirection: 'UP' | 'DOWN';
    pointsData: any;
    originalPointCount: number;
    pointsInRegion: number;
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

    // Get all prices for the segment
    const prices = timestamps.map(ts => parseFloat(data[ts]['4. close']));
    const x0 = prices[prices.length - 1]; // Last price (most recent)
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = (minPrice + maxPrice) / 2;
    const trendDirection = x0 > averagePrice ? 'UP' : 'DOWN';

    // Determine which part of the chart x0 belongs to (above or below average)
    // Then adjust the number of points based on the requirement (6-21 points)
    let adjustedTimestamps = [...timestamps];
    const originalPointCount = timestamps.length;
    
    // Count points in the same region as x0 (above or below average)
    const pointsInRegion = prices.filter(price => {
      if (trendDirection === 'UP') {
        return price > averagePrice; // Points above average for UP trend
      } else {
        return price < averagePrice; // Points below average for DOWN trend
      }
    }).length;
    
    // Adjust the number of points
    if (pointsInRegion < 6) {
      // Too few points in the region - this is rare with 2-hour segments
      // For now, we'll just keep all points and log the issue
      console.log(`WARNING: Only ${pointsInRegion} points in ${trendDirection} region for ${symbol}, which is below minimum of 6`);
      // In a more advanced implementation, we could expand the time window
    } else if (pointsInRegion > 21) {
      // Too many points in the region - reduce the time window by 20%
      console.log(`Too many points (${pointsInRegion}) in ${trendDirection} region for ${symbol}, reducing time window by 20%`);
      
      // Calculate how many timestamps to keep (80% of original)
      const keepPercentage = 0.8; // Keep 80% of the points
      const pointsToKeep = Math.floor(timestamps.length * keepPercentage);
      
      // Remove oldest points (from the beginning of the array)
      // This effectively reduces the time window while keeping the most recent data
      adjustedTimestamps = timestamps.slice(timestamps.length - pointsToKeep);
      
      // Recalculate the points in region after time window reduction
      const newPrices = adjustedTimestamps.map(ts => parseFloat(data[ts]['4. close']));
      const newX0 = newPrices[newPrices.length - 1]; // Last price (most recent)
      const newMinPrice = Math.min(...newPrices);
      const newMaxPrice = Math.max(...newPrices);
      const newAveragePrice = (newMinPrice + newMaxPrice) / 2;
      const newTrendDirection = newX0 > newAveragePrice ? 'UP' : 'DOWN';
      
      // Count points in the same region after reduction
      const newPointsInRegion = newPrices.filter(price => {
        if (newTrendDirection === 'UP') {
          return price > newAveragePrice;
        } else {
          return price < newAveragePrice;
        }
      }).length;
      
      console.log(`Reduced time window from ${timestamps.length} to ${adjustedTimestamps.length} points`);
      console.log(`New points in ${newTrendDirection} region: ${newPointsInRegion}`);
      
      // If we still have too many points, recursively reduce again
      if (newPointsInRegion > 21) {
        console.log(`Still too many points (${newPointsInRegion}), reducing further...`);
        
        // Recursive reduction (up to 5 times to avoid infinite loops)
        let attempts = 1;
        let currentTimestamps = adjustedTimestamps;
        let currentPointsInRegion = newPointsInRegion;
        let currentTrendDirection = newTrendDirection;
        
        while (currentPointsInRegion > 21 && attempts < 5) {
          // Calculate how much more to reduce based on how far we are from target
          // The more we exceed the target, the more aggressive the reduction
          const reductionFactor = Math.min(0.5, 0.2 + (currentPointsInRegion - 21) / 100);
          
          const furtherReducedTimestamps = currentTimestamps.slice(
            Math.floor(currentTimestamps.length * reductionFactor) // Remove more points from the beginning
          );
          
          // Make sure we don't reduce too much
          if (furtherReducedTimestamps.length < 21) {
            console.log(`Cannot reduce further without going below minimum points (${furtherReducedTimestamps.length})`);
            break;
          }
          
          // Recalculate again
          const furtherPrices = furtherReducedTimestamps.map(ts => parseFloat(data[ts]['4. close']));
          const furtherMinPrice = Math.min(...furtherPrices);
          const furtherMaxPrice = Math.max(...furtherPrices);
          const furtherAveragePrice = (furtherMinPrice + furtherMaxPrice) / 2;
          const furtherX0 = furtherPrices[furtherPrices.length - 1];
          const furtherTrendDirection = furtherX0 > furtherAveragePrice ? 'UP' : 'DOWN';
          
          currentPointsInRegion = furtherPrices.filter(price => {
            if (furtherTrendDirection === 'UP') {
              return price > furtherAveragePrice;
            } else {
              return price < furtherAveragePrice;
            }
          }).length;
          
          currentTimestamps = furtherReducedTimestamps;
          currentTrendDirection = furtherTrendDirection;
          attempts++;
          
          console.log(`Attempt ${attempts}: Reduced to ${currentTimestamps.length} points, ${currentPointsInRegion} in ${currentTrendDirection} region (reduction factor: ${reductionFactor.toFixed(2)})`);
          
          // If trend direction changed, we need to recalculate points in region
          if (currentTrendDirection !== newTrendDirection) {
            console.log(`Trend direction changed from ${newTrendDirection} to ${currentTrendDirection}`);
          }
        }
        
        // Use the final reduced timestamps
        adjustedTimestamps = currentTimestamps;
      }
    }

    // Recalculate all values based on the final adjusted timestamps
    const finalPrices = adjustedTimestamps.map(ts => parseFloat(data[ts]['4. close']));
    const finalX0 = finalPrices[finalPrices.length - 1]; // Last price (most recent)
    const finalMinPrice = Math.min(...finalPrices);
    const finalMaxPrice = Math.max(...finalPrices);
    const finalAveragePrice = (finalMinPrice + finalMaxPrice) / 2;
    const finalTrendDirection = finalX0 > finalAveragePrice ? 'UP' : 'DOWN';
    
    // Count final points in region
    const finalPointsInRegion = finalPrices.filter(price => {
      if (finalTrendDirection === 'UP') {
        return price > finalAveragePrice;
      } else {
        return price < finalAveragePrice;
      }
    }).length;
    
    console.log(`Final analysis for ${symbol}: ${adjustedTimestamps.length} total points, ${finalPointsInRegion} in ${finalTrendDirection} region`);

    // Create segment data from adjusted timestamps
    const pointsData = adjustedTimestamps.map(ts => ({
      timestamp: ts,
      open: parseFloat(data[ts]['1. open']),
      high: parseFloat(data[ts]['2. high']),
      low: parseFloat(data[ts]['3. low']),
      close: parseFloat(data[ts]['4. close']),
      volume: parseFloat(data[ts]['5. volume'])
    }));

    // Generate a unique ID that's URL-friendly
    // Format: SYMBOL_DATE_TIMESTAMP (using UUID to ensure uniqueness)
    const segmentId = `${symbol}_${date}_${uuidv4().substring(0, 8)}`;

    // Create a new object with the final values
    const result = {
      id: segmentId,
      symbol: symbol.toUpperCase(),
      date,
      segmentStart: adjustedTimestamps[0],
      segmentEnd: adjustedTimestamps[adjustedTimestamps.length - 1],
      pointCount: adjustedTimestamps.length,
      x0: finalX0,
      minPrice: finalMinPrice,
      maxPrice: finalMaxPrice,
      averagePrice: finalAveragePrice,
      trendDirection: finalTrendDirection,
      pointsData,
      originalPointCount: timestamps.length,
      pointsInRegion: finalPointsInRegion
    };
    
    // Double check that the points in region is correct
    if (result.pointsInRegion > 21) {
      console.warn(`WARNING: Still too many points in region (${result.pointsInRegion}) for ${symbol} after reduction!`);
    }
    
    return result;
  }

  /**
   * Save analysis results to database
   */
  async saveAnalysisResults(segments: any[]): Promise<number> {
    let savedCount = 0;
    
    for (const segment of segments) {
      try {
        await sql`
          INSERT INTO analysis_results (
            id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, 
            points_data, original_point_count, points_in_region, schema_type
          ) VALUES (
            ${segment.id},
            ${segment.symbol},
            ${segment.date},
            ${segment.segmentStart},
            ${segment.segmentEnd},
            ${segment.pointCount},
            ${segment.x0},
            ${segment.minPrice},
            ${segment.maxPrice},
            ${segment.averagePrice},
            ${segment.trendDirection},
            ${JSON.stringify(segment.pointsData)},
            ${segment.originalPointCount},
            ${segment.pointsInRegion},
            'UNCLASSIFIED'
          )
          ON CONFLICT (id) DO NOTHING
        `;
        savedCount++;
      } catch (error) {
        console.error(`Error saving segment ${segment.id}:`, error);
      }
    }
    
    return savedCount;
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
      const savedCount = await this.saveAnalysisResults(segments);
      
      return {
        success: true,
        message: `Successfully processed ${symbol}`,
        segmentsCreated: savedCount
      };
    } catch (error: any) {
      console.error(`Error processing ${symbol}:`, error);
      return {
        success: false,
        message: `Error processing ${symbol}: ${error.message}`,
        segmentsCreated: 0
      };
    }
  }
}
