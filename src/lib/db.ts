/**
 * Database Connection
 * ===================
 * 
 * DrizzleORM database connection with proper error handling and connection pooling
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import * as schema from './schema';
import { 
  StockData, 
  NewStockData, 
  AnalysisResult, 
  NewAnalysisResult,
  StockDataWithPoints,
  AnalysisResultWithChart,
  schemaTypeSchema,
  trendDirectionSchema
} from './schema';

// Environment validation function
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'] as const;
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
}

// Database connection with proper singleton pattern for Next.js
let db: ReturnType<typeof drizzle> | null = null;

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

  static async getAllStockData(): Promise<StockData[]> {
    try {
      return await this.db
        .select()
        .from(schema.stockData)
        .orderBy(desc(schema.stockData.createdAt));
    } catch (error) {
      console.error('Error fetching all stock data:', error);
      throw new Error('Failed to fetch stock data');
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
    } catch (error) {
      console.error('Error updating analysis schema:', error);
      throw new Error('Failed to update analysis schema');
    }
  }

  static async getSegmentData(segmentId: string): Promise<AnalysisResultWithChart | null> {
    try {
      const decodedSegmentId = decodeURIComponent(segmentId);
      
      const [result] = await this.db
        .select()
        .from(schema.analysisResults)
        .where(eq(schema.analysisResults.id, decodedSegmentId))
        .limit(1);
      
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
      };
    } catch (error) {
      console.error('Error fetching segment data:', error);
      throw new Error('Failed to fetch segment data');
    }
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
