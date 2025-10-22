/**
 * Database Connection
 * ===================
 * 
 * DrizzleORM database connection with proper error handling and connection pooling
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import * as schema from './schema';
import { 
  StockData, 
  NewStockData, 
  AnalysisResult, 
  NewAnalysisResult,
  ChartImage,
  AnalysisResultWithChart,
  AnalysisResultsImage,
  NewAnalysisResultsImage,
  schemaTypeSchema
} from './schema';
import { createAnalysisResultImage } from './chartImageGenerator';

// Type pour getAllStockData sans la colonne data (trop volumineuse)
type StockDataSummary = Omit<StockData, 'data'>;

// Environment validation function
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'] as const;
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

// Database connection with proper singleton pattern for Next.js

export function getDatabase() {
  // Use global variable to persist connection across module reloads in development
  if (!global._drizzleDb) {
    try {
      validateEnvironment();
      const connection = neon(process.env.DATABASE_URL!);
      global._drizzleDb = drizzle(connection, { schema });
    } catch (error) {
      console.error('Failed to create database connection:', error);
      throw new Error('Database connection failed');
    }
  }
  
  // Return the global connection
  return global._drizzleDb;
}

// Utility function pour extraire l'intervalle de dates
function getDateRangeFromStreamData(data: Record<string, unknown>): string {
  if (!data || typeof data !== 'object') return 'N/A';
  
  const timestamps = Object.keys(data).filter(key => 
    key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  );
  
  if (timestamps.length === 0) return 'N/A';
  
  const sorted = timestamps.sort();
  const startDate = sorted[0].split(' ')[0];
  const endDate = sorted[sorted.length - 1].split(' ')[0];
  
  // Si c'est le même jour, afficher seulement la date
  if (startDate === endDate) {
    return new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Si c'est des jours différents, afficher la plage
  const start = new Date(startDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const end = new Date(endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  return `${start} - ${end}`;
}

// Database service class with proper error handling
export class DatabaseService {
  private static get db() {
    return getDatabase();
  }

  // Stock Data Operations
  static async createStockData(data: NewStockData): Promise<StockData> {
    try {
      const [result] = await this.db
        .insert(schema.stockData)
        .values(data)
        .returning();
      
      if (!result) {
        throw new Error('Failed to create stock data');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating stock data:', error);
      throw new Error('Failed to create stock data');
    }
  }

  static async getStockData(symbol: string, date: string): Promise<StockData | null> {
    try {
      const [result] = await this.db
        .select()
        .from(schema.stockData)
        .where(and(
          eq(schema.stockData.symbol, symbol.toUpperCase()),
          eq(schema.stockData.date, date)
        ))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      throw new Error('Failed to fetch stock data');
    }
  }

  static async getAllStockData(): Promise<StockDataSummary[]> {
    try {
      return await this.db
        .select({
          id: schema.stockData.id,
          symbol: schema.stockData.symbol,
          date: schema.stockData.date,
          totalPoints: schema.stockData.totalPoints,
          marketType: schema.stockData.marketType,
          createdAt: schema.stockData.createdAt
          // Exclure la colonne 'data' qui est trop volumineuse
        })
        .from(schema.stockData)
        .orderBy(desc(schema.stockData.createdAt));
    } catch (error) {
      console.error('Error fetching all stock data:', error);
      throw new Error('Failed to fetch stock data');
    }
  }

  /**
   * Récupère les données groupées par symbole avec le total des points
   * Évite les doublons quand un symbole a plusieurs streams
   * Calcule les vraies plages de dates depuis les données JSON
   */
  static async getStockDataGroupedBySymbol(): Promise<Array<{
    symbol: string;
    totalPoints: number;
    marketType: string;
    streamCount: number;
    dateRange: string;
    earliestDate: string;
    latestDate: string;
  }>> {
    try {
      // Récupérer toutes les données avec les données JSON pour calculer les vraies dates
      const allStreams = await this.db
        .select({
          symbol: schema.stockData.symbol,
          totalPoints: schema.stockData.totalPoints,
          marketType: schema.stockData.marketType,
          data: schema.stockData.data
        })
        .from(schema.stockData)
        .orderBy(desc(schema.stockData.createdAt));

      // Grouper par symbole et calculer les vraies plages de dates
      const groupedData = new Map<string, {
        symbol: string;
        totalPoints: number;
        marketType: string;
        streamCount: number;
        allTimestamps: string[];
      }>();

      for (const stream of allStreams) {
        const key = stream.symbol;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            symbol: stream.symbol,
            totalPoints: 0,
            marketType: stream.marketType,
            streamCount: 0,
            allTimestamps: []
          });
        }

        const group = groupedData.get(key)!;
        group.totalPoints += stream.totalPoints;
        group.streamCount += 1;

        // Extraire les timestamps des données JSON
        const data = stream.data as Record<string, unknown>;
        const timestamps = Object.keys(data).filter(key => 
          key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
        );
        group.allTimestamps.push(...timestamps);
      }

      // Convertir en array et calculer les plages de dates
      return Array.from(groupedData.values()).map(group => {
        const sortedTimestamps = group.allTimestamps.sort();
        const startDate = sortedTimestamps[0]?.split(' ')[0] || 'N/A';
        const endDate = sortedTimestamps[sortedTimestamps.length - 1]?.split(' ')[0] || 'N/A';
        
        const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
        
        return {
          symbol: group.symbol,
          totalPoints: group.totalPoints,
          marketType: group.marketType,
          streamCount: group.streamCount,
          dateRange,
          earliestDate: startDate,
          latestDate: endDate
        };
      });
    } catch (error) {
      console.error('Error fetching grouped stock data:', error);
      throw new Error('Failed to fetch grouped stock data');
    }
  }

  static async upsertStockData(data: NewStockData): Promise<StockData> {
    try {
      const [result] = await this.db
        .insert(schema.stockData)
        .values(data)
        .onConflictDoUpdate({
          target: [schema.stockData.symbol, schema.stockData.date],
          set: {
            data: data.data,
            totalPoints: data.totalPoints,
            createdAt: new Date()
          }
        })
        .returning();
      
      if (!result) {
        throw new Error('Failed to upsert stock data');
      }
      
      return result;
    } catch (error) {
      console.error('Error upserting stock data:', error);
      throw new Error('Failed to upsert stock data');
    }
  }

  // Analysis Results Operations
  static async createAnalysisResult(data: NewAnalysisResult): Promise<AnalysisResult> {
    try {
      const [result] = await this.db
        .insert(schema.analysisResults)
        .values(data)
        .returning();
      
      if (!result) {
        throw new Error('Failed to create analysis result');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating analysis result:', error);
      throw new Error('Failed to create analysis result');
    }
  }

  static async getAnalysisResults(symbol: string): Promise<AnalysisResult[]> {
    try {
      return await this.db
        .select()
        .from(schema.analysisResults)
        .where(eq(schema.analysisResults.symbol, symbol.toUpperCase()))
        .orderBy(desc(schema.analysisResults.schemaType), desc(schema.analysisResults.createdAt));
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      throw new Error('Failed to fetch analysis results');
    }
  }

  // Nouvelle méthode pour récupérer les segments d'un stream spécifique
  static async getAnalysisResultsByStreamId(stockDataId: string): Promise<AnalysisResult[]> {
    try {
      return await this.db
        .select()
        .from(schema.analysisResults)
        .where(eq(schema.analysisResults.stockDataId, stockDataId))
        .orderBy(desc(schema.analysisResults.schemaType), desc(schema.analysisResults.createdAt));
    } catch (error) {
      console.error('Error fetching analysis results by stream ID:', error);
      throw new Error('Failed to fetch analysis results by stream ID');
    }
  }

  static async getAllAnalysisResults(): Promise<AnalysisResult[]> {
    try {
      return await this.db
        .select()
        .from(schema.analysisResults)
        .orderBy(desc(schema.analysisResults.schemaType), desc(schema.analysisResults.createdAt));
    } catch (error) {
      console.error('Error fetching all analysis results:', error);
      throw new Error('Failed to fetch analysis results');
    }
  }

  // Batch counters by symbol
  static async getSegmentCountsForSymbols(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    try {
      const upper = symbols.map(s => s.toUpperCase());
      const rows = await this.db
        .select({
          symbol: schema.analysisResults.symbol,
          count: sql<number>`count(*)`,
        })
        .from(schema.analysisResults)
        .where(inArray(schema.analysisResults.symbol, upper))
        .groupBy(schema.analysisResults.symbol);
      const map: Record<string, number> = {};
      for (const row of rows as Array<{ symbol: string; count: number }>) {
        map[row.symbol] = Number(row.count);
      }
      return map;
    } catch (error) {
      console.error('Error counting segments by symbol:', error);
      throw new Error('Failed to count segments');
    }
  }

  static async getDatasetCountsForSymbols(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    try {
      const upper = symbols.map(s => s.toUpperCase());
      const rows = await this.db
        .select({
          symbol: schema.stockData.symbol,
          count: sql<number>`count(*)`,
        })
        .from(schema.stockData)
        .where(inArray(schema.stockData.symbol, upper))
        .groupBy(schema.stockData.symbol);
      const map: Record<string, number> = {};
      for (const row of rows as Array<{ symbol: string; count: number }>) {
        map[row.symbol] = Number(row.count);
      }
      return map;
    } catch (error) {
      console.error('Error counting datasets by symbol:', error);
      throw new Error('Failed to count datasets');
    }
  }

  // Nouvelle méthode pour récupérer le nombre de segments par stream spécifique
  static async getSegmentCountsForStreams(streamIds: string[]): Promise<Record<string, number>> {
    if (streamIds.length === 0) return {};
    try {
      const rows = await this.db
        .select({
          stockDataId: schema.analysisResults.stockDataId,
          count: sql<number>`count(*)`,
        })
        .from(schema.analysisResults)
        .where(inArray(schema.analysisResults.stockDataId, streamIds))
        .groupBy(schema.analysisResults.stockDataId);
      const map: Record<string, number> = {};
      for (const row of rows as Array<{ stockDataId: string; count: number }>) {
        map[row.stockDataId] = Number(row.count);
      }
      return map;
    } catch (error) {
      console.error('Error counting segments by stream:', error);
      throw new Error('Failed to count segments by stream');
    }
  }

  // Nouvelle méthode pour récupérer les streams avec leurs données pour calculer les intervalles de dates
  static async getStreamsWithDateRanges(symbol: string): Promise<Array<{
    id: string;
    symbol: string;
    date: string;
    totalPoints: number;
    marketType: string;
    createdAt: Date;
    dateRange: string;
  }>> {
    try {
      const streams = await this.db
        .select({
          id: schema.stockData.id,
          symbol: schema.stockData.symbol,
          date: schema.stockData.date,
          totalPoints: schema.stockData.totalPoints,
          marketType: schema.stockData.marketType,
          createdAt: schema.stockData.createdAt,
          data: schema.stockData.data
        })
        .from(schema.stockData)
        .where(eq(schema.stockData.symbol, symbol.toUpperCase()))
        .orderBy(desc(schema.stockData.createdAt));

      return streams.map(stream => {
        const dateRange = getDateRangeFromStreamData(stream.data as Record<string, unknown>);
        return {
          id: stream.id,
          symbol: stream.symbol,
          date: stream.date,
          totalPoints: stream.totalPoints,
          marketType: stream.marketType,
          createdAt: stream.createdAt,
          dateRange
        };
      });
    } catch (error) {
      console.error('Error fetching streams with date ranges:', error);
      throw new Error('Failed to fetch streams with date ranges');
    }
  }

  static async getAnalysisResultsByDateRange(
    symbol: string, 
    startDate: string, 
    endDate: string
  ): Promise<AnalysisResult[]> {
    try {
      return await this.db
        .select()
        .from(schema.analysisResults)
        .where(and(
          eq(schema.analysisResults.symbol, symbol.toUpperCase()),
          gte(schema.analysisResults.date, startDate),
          lte(schema.analysisResults.date, endDate)
        ))
        .orderBy(desc(schema.analysisResults.schemaType), desc(schema.analysisResults.createdAt));
    } catch (error) {
      console.error('Error fetching analysis results by date range:', error);
      throw new Error('Failed to fetch analysis results');
    }
  }

  static async updateAnalysisSchema(
    id: string, 
    schemaType: 'R' | 'V' | 'UNCLASSIFIED'
  ): Promise<void> {
    try {
      // Validate schema type
      const validatedSchemaType = schemaTypeSchema.parse(schemaType);
      
      const result = await this.db
        .update(schema.analysisResults)
        .set({ schemaType: validatedSchemaType })
        .where(eq(schema.analysisResults.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error('Analysis result not found');
      }

      // Regenerate chart image after schema change
      await this.regenerateSegmentImage(id);
    } catch (error) {
      console.error('Error updating analysis schema:', error);
      throw new Error('Failed to update analysis schema');
    }
  }

  static async updateAnalysisResult(
    id: string, 
    updateData: {
      schemaType?: 'R' | 'V' | 'UNCLASSIFIED';
      patternPoint?: string | null;
    }
  ): Promise<boolean> {
    try {
      const updateFields: any = {};
      
      if (updateData.schemaType !== undefined) {
        updateFields.schemaType = schemaTypeSchema.parse(updateData.schemaType);
      }
      
      if (updateData.patternPoint !== undefined) {
        updateFields.patternPoint = updateData.patternPoint;
      }
      
      const result = await this.db
        .update(schema.analysisResults)
        .set(updateFields)
        .where(eq(schema.analysisResults.id, id))
        .returning();
      
      const ok = result.length > 0;
      if (ok) {
        await this.regenerateSegmentImage(id, {
          patternPoint: updateData.patternPoint,
          schemaType: updateData.schemaType,
        });
      }
      return ok;
    } catch (error) {
      console.error('Error updating analysis result:', error);
      throw new Error('Failed to update analysis result');
    }
  }

  static async getSegmentData(segmentId: string): Promise<AnalysisResultWithChart | null> {
    try {
      // First, try to decode the URL segment ID
      const decodedSegmentId = decodeURIComponent(segmentId);
      
      // Try to find the segment by exact ID match first
      let result = await this.db
        .select()
        .from(schema.analysisResults)
        .where(eq(schema.analysisResults.id, decodedSegmentId))
        .limit(1)
        .then(results => results[0] || null);
      
      // If not found, try to find by partial match (the URL format might differ from DB format)
      if (!result) {
        console.log(`Segment not found by exact ID: ${decodedSegmentId}, trying partial match...`);
        
        // Extract parts from the segment ID (assuming format like SYMBOL_DATE_START_END)
        const parts = decodedSegmentId.split('_');
        if (parts.length >= 2) {
          const symbol = parts[0];
          // Get all segments for this symbol and find the best match
          const segments = await this.db
            .select()
            .from(schema.analysisResults)
            .where(eq(schema.analysisResults.symbol, symbol));
          
          // Find the first segment that contains parts of the original ID
          const foundSegment = segments.find(seg => seg.id.includes(parts[1]));
          if (foundSegment) {
            result = foundSegment;
          }
        }
      }
      
      if (!result) {
        return null;
      }

      return {
        ...result,
        pointsData: (result.pointsData as Array<{
          timestamp: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>) || []
      } as AnalysisResultWithChart;
    } catch (error) {
      console.error('Error fetching segment data:', error);
      throw new Error('Failed to fetch segment data');
    }
  }

  /**
   * Save a chart image to the database
   */
  static async saveChartImage(params: {
    segmentId: string;
    svgContent: string;
    width: number;
    height: number;
    format?: 'svg' | 'png';
  }): Promise<string> {
    try {
      const { segmentId, svgContent, width, height, format = 'svg' } = params;
      
      // Generate a unique ID for the chart image
      const id = `chart_${segmentId}_${Date.now()}`;
      
      // Insert the chart image into the database
      await this.db.insert(schema.chartImages).values({
        id,
        segmentId,
        svgContent,
        width,
        height,
        format,
      });
      
      return id;
    } catch (error) {
      console.error('Error saving chart image:', error);
      throw new Error('Failed to save chart image');
    }
  }
  
  /**
   * Get a chart image by ID
   */
  static async getChartImageById(id: string): Promise<ChartImage | null> {
    try {
      const result = await this.db
        .select()
        .from(schema.chartImages)
        .where(eq(schema.chartImages.id, id))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching chart image:', error);
      throw new Error('Failed to fetch chart image');
    }
  }
  
  /**
   * Get the latest chart image for a segment
   */
  static async getLatestChartForSegment(segmentId: string): Promise<ChartImage | null> {
    try {
      const result = await this.db
        .select()
        .from(schema.chartImages)
        .where(eq(schema.chartImages.segmentId, segmentId))
        .orderBy(desc(schema.chartImages.createdAt))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching chart for segment:', error);
      throw new Error('Failed to fetch chart for segment');
    }
  }
  
  /**
   * Delete a chart image by ID
   */
  static async deleteChartImage(id: string): Promise<void> {
    try {
      await this.db
        .delete(schema.chartImages)
        .where(eq(schema.chartImages.id, id));
    } catch (error) {
      console.error('Error deleting chart image:', error);
      throw new Error('Failed to delete chart image');
    }
  }

  // Regenerate the analysis image for a segment
  private static async regenerateSegmentImage(
    segmentId: string,
    override?: { patternPoint?: string | null; schemaType?: 'R' | 'V' | 'UNCLASSIFIED' }
  ): Promise<void> {
    const seg = await this.getSegmentData(segmentId);
    if (!seg) return;

    const imageSegmentData = {
      id: seg.id,
      pointsData: (seg.pointsData as Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }>) || [],
      minPrice: Number(seg.minPrice),
      maxPrice: Number(seg.maxPrice),
      averagePrice: Number(seg.averagePrice),
      x0: Number(seg.x0),
      patternPoint: override?.patternPoint !== undefined ? override.patternPoint : (seg.patternPoint as string | null),
    };

    const imageData = createAnalysisResultImage(segmentId, imageSegmentData, 800, 400);

    await this.db.delete(schema.analysisResultsImages).where(eq(schema.analysisResultsImages.analysisResultId, segmentId));
    await this.db.insert(schema.analysisResultsImages).values({
      id: imageData.id,
      analysisResultId: imageData.analysisResultId,
      imgData: imageData.imgData,
    });
  }

  static async getAnalysisStats(): Promise<{
    totalSegments: number;
    upTrends: number;
    downTrends: number;
    rSchemas: number;
    vSchemas: number;
    unclassifiedSchemas: number;
    symbols: string[];
  }> {
    try {
      const [stats] = await this.db
        .select({
          totalSegments: sql<number>`count(*)`,
          upTrends: sql<number>`count(case when ${schema.analysisResults.trendDirection} = 'UP' then 1 end)`,
          downTrends: sql<number>`count(case when ${schema.analysisResults.trendDirection} = 'DOWN' then 1 end)`,
          rSchemas: sql<number>`count(case when ${schema.analysisResults.schemaType} = 'R' then 1 end)`,
          vSchemas: sql<number>`count(case when ${schema.analysisResults.schemaType} = 'V' then 1 end)`,
          unclassifiedSchemas: sql<number>`count(case when ${schema.analysisResults.schemaType} = 'UNCLASSIFIED' then 1 end)`,
          symbols: sql<string[]>`array_agg(distinct ${schema.analysisResults.symbol})`
        })
        .from(schema.analysisResults);
      
      return {
        totalSegments: Number(stats.totalSegments),
        upTrends: Number(stats.upTrends),
        downTrends: Number(stats.downTrends),
        rSchemas: Number(stats.rSchemas),
        vSchemas: Number(stats.vSchemas),
        unclassifiedSchemas: Number(stats.unclassifiedSchemas),
        symbols: stats.symbols || []
      };
    } catch (error) {
      console.error('Error fetching analysis stats:', error);
      throw new Error('Failed to fetch analysis stats');
    }
  }

  // Analysis Results Images Operations
  
  /**
   * Crée une nouvelle image pour un résultat d'analyse
   */
  static async createAnalysisResultImage(data: NewAnalysisResultsImage): Promise<AnalysisResultsImage> {
    try {
      const [result] = await this.db
        .insert(schema.analysisResultsImages)
        .values(data)
        .returning();
      
      if (!result) {
        throw new Error('Failed to create analysis result image');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating analysis result image:', error);
      throw new Error('Failed to create analysis result image');
    }
  }

  /**
   * Récupère l'image associée à un résultat d'analyse
   */
  static async getAnalysisResultImage(analysisResultId: string): Promise<AnalysisResultsImage | null> {
    try {
      const [result] = await this.db
        .select()
        .from(schema.analysisResultsImages)
        .where(eq(schema.analysisResultsImages.analysisResultId, analysisResultId))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching analysis result image:', error);
      throw new Error('Failed to fetch analysis result image');
    }
  }

  /**
   * Récupère une image par son ID
   */
  static async getAnalysisResultImageById(id: string): Promise<AnalysisResultsImage | null> {
    try {
      const [result] = await this.db
        .select()
        .from(schema.analysisResultsImages)
        .where(eq(schema.analysisResultsImages.id, id))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching analysis result image by id:', error);
      throw new Error('Failed to fetch analysis result image');
    }
  }

  /**
   * Supprime l'image associée à un résultat d'analyse
   */
  static async deleteAnalysisResultImage(id: string): Promise<void> {
    try {
      await this.db
        .delete(schema.analysisResultsImages)
        .where(eq(schema.analysisResultsImages.id, id));
    } catch (error) {
      console.error('Error deleting analysis result image:', error);
      throw new Error('Failed to delete analysis result image');
    }
  }

  /**
   * Récupère tous les segments qui n'ont pas d'image associée
   */
  static async getSegmentsWithoutImage(): Promise<AnalysisResult[]> {
    try {
      const results = await this.db
        .select()
        .from(schema.analysisResults)
        .leftJoin(
          schema.analysisResultsImages,
          eq(schema.analysisResults.id, schema.analysisResultsImages.analysisResultId)
        )
        .where(sql`${schema.analysisResultsImages.id} IS NULL`)
        .orderBy(desc(schema.analysisResults.createdAt));
      
      return results.map(r => r.analysis_results);
    } catch (error) {
      console.error('Error fetching segments without image:', error);
      throw new Error('Failed to fetch segments without image');
    }
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
