/**
 * Stock Analysis Service
 * ======================
 * 
 * Service for fetching stock data and running analysis
 * Implements the point adjustment logic for trend analysis
 */

import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

// Charger les variables d'environnement
config({ path: '.env' });

// Database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
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
   * Extrait la date des données API (la plus récente)
   */
  private extractDateFromApiData(data: Record<string, unknown>): string {
    const timestamps = Object.keys(data);
    if (timestamps.length === 0) {
      throw new Error('No timestamps found in API data');
    }
    
    // Trier les timestamps pour trouver la plus récente
    const sortedTimestamps = timestamps.sort();
    const mostRecentTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
    
    // Extraire la date du timestamp (format: "2025-01-23 16:00:00")
    const date = new Date(mostRecentTimestamp).toISOString().split('T')[0];
    
    console.log(`📅 Date extraite des données API: ${date} (timestamp le plus récent: ${mostRecentTimestamp})`);
    
    return date;
  }

  /**
   * Save stock data to database with correct date from API data
   */
  async saveStockData(symbol: string, data: Record<string, unknown>): Promise<string> {
    const totalPoints = Object.keys(data).length;
    
    // ✅ CORRECT : Extraire la date des données API
    const date = this.extractDateFromApiData(data);
    const id = `${symbol.toUpperCase()}_${date}`;

    console.log(`💾 Sauvegarde des données pour ${symbol} avec date: ${date}`);

    await sql`
      INSERT INTO stock_data (id, symbol, date, data, total_points, market_type)
      VALUES (${id}, ${symbol.toUpperCase()}, ${date}, ${JSON.stringify(data)}, ${totalPoints}, 'STOCK')
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
  /**
   * Process and analyze stock data to extract meaningful segments
   * 
   * @param symbol Stock symbol (e.g., AAPL, MSFT)
   * @param data Raw stock price data
   * @returns Array of analyzed segments with filtering applied
   */
  extractSegments(symbol: string, data: Record<string, unknown>): Array<{
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
    pointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    originalPointCount: number;
    pointsInRegion: number;
  }> {
    const segments = [];
    const timestamps = Object.keys(data).sort();
    
    // Group by trading days
    const tradingDays = this.groupByTradingDays(timestamps);
    
    for (const [date, dayTimestamps] of Object.entries(tradingDays)) {
      // Extract 2-hour segments (120 minutes each)
      const segmentsForDay = this.processSegmentsForDay(symbol, date, dayTimestamps, data);
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
  /**
   * Process segments for a single trading day
   * Extracts 2-hour segments and processes each one
   */
  private processSegmentsForDay(
    symbol: string, 
    date: string, 
    timestamps: string[], 
    data: Record<string, unknown>
  ): Array<{
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
    pointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    originalPointCount: number;
    pointsInRegion: number;
  }> {
    const segments = [];
    const segmentDuration = 120; // 2 hours in minutes
    const maxSegmentsPerDay = 6; // Maximum segments per day

    // Sort timestamps
    timestamps.sort();

    // Extract segments
    for (let i = 0; i < timestamps.length - segmentDuration; i += segmentDuration) {
      const segmentTimestamps = timestamps.slice(i, i + segmentDuration);
      
      if (segmentTimestamps.length < 6) continue; // Skip if too few points
      
      const segmentData = this.processSegment(symbol, date, segmentTimestamps, data);
      if (segmentData) {
        segments.push(segmentData);
      }

      // Limit segments per day
      if (segments.length >= maxSegmentsPerDay) break;
    }

    return segments;
  }

  /**
   * Process a single segment through analysis and filtering
   * 
   * The processing follows these steps:
   * 1. Calculate initial metrics (min, max, average, trend)
   * 2. Filter points to include only those in the same region as X0 (UP/DOWN)
   * 3. Apply plateau and constant derivative filtering
   * 4. Adjust point count to stay within 6-40 point range
   */
  protected processSegment(
    symbol: string, 
    date: string, 
    timestamps: string[], 
    data: Record<string, unknown>
  ): {
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
    pointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    originalPointCount: number;
    pointsInRegion: number;
  } | null {
    if (timestamps.length < 6) return null;

    const originalPointCount = timestamps.length;
    
    // Step 1: Calculate initial metrics
    const prices = timestamps.map(ts => parseFloat((data[ts] as Record<string, unknown>)['4. close'] as string));
    const x0 = prices[prices.length - 1]; // Last price (most recent)
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = (minPrice + maxPrice) / 2;
    const trendDirection = x0 > averagePrice ? 'UP' : 'DOWN';
    
    console.log(`Processing segment for ${symbol} on ${date}, trend: ${trendDirection}, original points: ${timestamps.length}`);
    
    // Step 2: Filter points to keep only those in the same region as X0
    const sameRegionIndices = [];
    for (let i = 0; i < prices.length; i++) {
      if ((trendDirection === 'UP' && prices[i] > averagePrice) || 
          (trendDirection === 'DOWN' && prices[i] < averagePrice)) {
        sameRegionIndices.push(i);
      }
    }
    
    // Create filtered arrays based on region
    let regionFilteredTimestamps = sameRegionIndices.map(idx => timestamps[idx]);
    let regionFilteredPrices = sameRegionIndices.map(idx => prices[idx]);
    
    const pointsInRegion = regionFilteredTimestamps.length;
    console.log(`Points in ${trendDirection} region: ${pointsInRegion}`);
    
    // Check if we have too few points after region filtering
    if (pointsInRegion < 6) {
      console.log(`WARNING: Only ${pointsInRegion} points in ${trendDirection} region for ${symbol}, which is below minimum of 6`);
      // Keep original timestamps and apply only subsequent filtering
      regionFilteredTimestamps = [...timestamps];
      regionFilteredPrices = [...prices];
    }
    
    // Step 3: Apply plateau and constant derivative filtering
    const plateauFilteredIndices = this.removeRedundantPoints(regionFilteredTimestamps, regionFilteredPrices);
    let adjustedTimestamps = plateauFilteredIndices.map(idx => regionFilteredTimestamps[idx]);
    
    console.log(`After plateau/derivative filtering: ${adjustedTimestamps.length} points`);
    
    // If we have too few points after all filtering, revert to region-filtered set
    if (adjustedTimestamps.length < 6) {
      console.log(`WARNING: Plateau filtering reduced points below minimum (${adjustedTimestamps.length}), reverting to region-filtered`); 
      adjustedTimestamps = [...regionFilteredTimestamps];
    }
    
    // Step 4: Adjust point count to stay within range (6-40)
    // Check if we have too many points
    if (adjustedTimestamps.length > 40) {
      console.log(`Too many points (${adjustedTimestamps.length}) after filtering for ${symbol}, reducing time window by 20%`);
      
      // Keep 80% of points, removing from the beginning (oldest)
      const keepPercentage = 0.8;
      adjustedTimestamps = adjustedTimestamps.slice(
        Math.floor(adjustedTimestamps.length * (1 - keepPercentage))
      );
      
      // Calculate metrics after reduction
      const reducedPointCount = adjustedTimestamps.length;
      
      console.log(`Reduced to ${reducedPointCount} points`);
      
      // If we still have too many points, recursively reduce again
      if (reducedPointCount > 40) {
        console.log(`Still too many points (${reducedPointCount}), reducing further...`);
        
        // Recursive reduction (up to 5 times to avoid infinite loops)
        let attempts = 1;
        let currentTimestamps = adjustedTimestamps;
        
        while (currentTimestamps.length > 40 && attempts < 5) {
          // Calculate how much more to reduce based on how far we are from target
          const reductionFactor = Math.min(0.5, 0.2 + (currentTimestamps.length - 40) / 100);
          
          const furtherReducedTimestamps = currentTimestamps.slice(
            Math.floor(currentTimestamps.length * reductionFactor) // Remove more points from the beginning
          );
          
          // Make sure we don't reduce too much
          if (furtherReducedTimestamps.length < 6) {
            console.log(`Cannot reduce further without going below minimum points (${furtherReducedTimestamps.length})`);
            break;
          }
          
          currentTimestamps = furtherReducedTimestamps;
          attempts++;
          
          console.log(`Attempt ${attempts}: Reduced to ${currentTimestamps.length} points (reduction factor: ${reductionFactor.toFixed(2)})`);
        }
        
        // Use the final reduced timestamps
        adjustedTimestamps = currentTimestamps;
      }
    }

    // Step 5: Recalculate all metrics based on the final adjusted timestamps
    const finalPrices = adjustedTimestamps.map(ts => parseFloat((data[ts] as Record<string, unknown>)['4. close'] as string));
    const finalX0 = finalPrices[finalPrices.length - 1]; // Last price (most recent)
    const finalMinPrice = Math.min(...finalPrices);
    const finalMaxPrice = Math.max(...finalPrices);
    const finalAveragePrice = (finalMinPrice + finalMaxPrice) / 2;
    const finalTrendDirection: 'UP' | 'DOWN' = finalX0 > finalAveragePrice ? 'UP' : 'DOWN';
    
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
    const pointsData = adjustedTimestamps.map(ts => {
      const dataPoint = data[ts] as Record<string, unknown>;
      return {
        timestamp: ts,
        open: parseFloat(dataPoint['1. open'] as string),
        high: parseFloat(dataPoint['2. high'] as string),
        low: parseFloat(dataPoint['3. low'] as string),
        close: parseFloat(dataPoint['4. close'] as string),
        volume: parseFloat(dataPoint['5. volume'] as string)
      };
    });

    // Generate a unique ID that's URL-friendly
    // Format: SYMBOL_DATE_TIMESTAMP (using UUID to ensure uniqueness)
    const segmentId = `${symbol}_${date}_${uuidv4().substring(0, 8)}`;

    console.log(`Final result: reduced from ${originalPointCount} to ${adjustedTimestamps.length} points`);
    
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
  async saveAnalysisResults(segments: Array<{
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
    pointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    originalPointCount: number;
    pointsInRegion: number;
  }>, stockDataId: string): Promise<number> {
    const { createAnalysisResultImage } = await import('./chartImageGenerator');
    let savedCount = 0;
    
    for (const segment of segments) {
      try {
        // Sauvegarder le segment
        await sql`
          INSERT INTO analysis_results (
            id, stock_data_id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, 
            points_data, original_point_count, points_in_region, schema_type
          ) VALUES (
            ${segment.id}, -- "AAPL_2025-01-23_abc123"
            ${stockDataId}, -- exact stock_data.id of the stream
            ${segment.symbol},      -- "AAPL" - GARDÉ pour les requêtes
            ${segment.date},        -- "2025-01-23" - GARDÉ pour les requêtes
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
        
        // Générer et sauvegarder l'image du graphique
        try {
          const imageData = createAnalysisResultImage(
            segment.id,
            {
              id: segment.id,
              pointsData: segment.pointsData,
              minPrice: segment.minPrice,
              maxPrice: segment.maxPrice,
              averagePrice: segment.averagePrice,
              x0: segment.x0,
              patternPoint: null
            },
            800,
            400
          );
          
          await sql`
            INSERT INTO analysis_results_images (
              id, analysis_result_id, img_data
            ) VALUES (
              ${imageData.id},
              ${imageData.analysisResultId},
              ${imageData.imgData}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (imageError) {
          console.error(`Error generating image for segment ${segment.id}:`, imageError);
          // On continue même si l'image n'a pas pu être générée
        }
        
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
  /**
   * Remove redundant points from price data:
   * 1. For plateaus: Removes middle point of 3 consecutive identical prices
   * 2. For constant derivatives: Removes middle point of 3 consecutive points with same rate of change
   * 
   * @param timestamps Array of timestamp strings
   * @param prices Array of price values corresponding to timestamps
   * @returns Array of indices to keep
   */
  private removeRedundantPoints(timestamps: string[], prices: number[]): number[] {
    if (prices.length < 3) return Array.from({ length: prices.length }, (_, index) => index);
    
    // Keep track of which indices to keep (start with all)
    const indicesToKeep = Array.from({ length: prices.length }, () => true);
    
    // Check for plateaus and constant derivatives
    for (let i = 0; i < prices.length - 2; i++) {
      // Check for plateau (3 identical prices)
      if (prices[i] === prices[i+1] && prices[i+1] === prices[i+2]) {
        // Mark the middle point to be removed
        indicesToKeep[i+1] = false;
        console.log(`Removing middle point of plateau at index ${i+1}, price ${prices[i]}`);
        // Skip the next point as we've already processed it as part of this plateau
        i++;
        continue;
      }
      
      // Check for constant derivative
      const derivative1 = prices[i+1] - prices[i];
      const derivative2 = prices[i+2] - prices[i+1];
      
      // If derivatives are very close (accounting for floating point precision)
      if (Math.abs(derivative1 - derivative2) < 0.0001) {
        // Mark the middle point to be removed
        indicesToKeep[i+1] = false;
        console.log(`Removing middle point of constant derivative at index ${i+1}, derivatives: ${derivative1.toFixed(4)}, ${derivative2.toFixed(4)}`);
        // Skip the next point as we've already processed it as part of this segment
        i++;
      }
    }
    
    // Create a new array with only the points we want to keep
    return prices.map((_, index) => index).filter(index => indicesToKeep[index]);
  
  }
}
