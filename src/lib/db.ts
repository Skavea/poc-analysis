/**
 * Database Connection
 * ===================
 * 
 * DrizzleORM database connection with proper error handling and connection pooling
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, or, desc, asc, sql, gte, lte, inArray, ne, isNotNull, isNull } from 'drizzle-orm';
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

  static async getStockDataById(id: string): Promise<StockData | null> {
    try {
      const [result] = await this.db
        .select()
        .from(schema.stockData)
        .where(eq(schema.stockData.id, id))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching stock data by ID:', error);
      throw new Error('Failed to fetch stock data by ID');
    }
  }

  /**
   * Récupère les 30 prochains points (prix) après la fin d'un segment
   * Utilise toutes les données stock_data pour le symbole donné
   * Si le segment se termine en fin de journée, ne récupère que les points de la même journée
   * @param symbol Symbole du marché (ex: AAPL)
   * @param segmentEnd Timestamp de fin du segment
   * @param segmentDate Date du segment (format YYYY-MM-DD)
   * @returns Tableau des prix (close) des 30 prochains points, ou tableau vide si moins de 30 points disponibles
   */
  static async getNext30Points(symbol: string, segmentEnd: Date | string, segmentDate: string): Promise<number[]> {
    try {
      // Convertir segmentEnd en Date si c'est une string
      const segmentEndDate = typeof segmentEnd === 'string' ? new Date(segmentEnd) : segmentEnd;
      
      // Extraire la date du segment_end (format YYYY-MM-DD)
      const segmentEndDateStr = segmentEndDate.toISOString().split('T')[0];
      
      // Extraire jour, heure et minute du segment_end pour la comparaison
      const segmentEndYear = segmentEndDate.getUTCFullYear();
      const segmentEndMonth = segmentEndDate.getUTCMonth();
      const segmentEndDay = segmentEndDate.getUTCDate();
      const segmentEndHour = segmentEndDate.getUTCHours();
      const segmentEndMinute = segmentEndDate.getUTCMinutes();
      
      // Déterminer si on est en fin de journée
      // Les marchés US ferment généralement à 16h00 heure locale (EST/EDT)
      // On considère qu'on est en fin de journée si on est après 15h30 heure locale
      // Pour simplifier, on vérifie l'heure UTC (les données sont généralement en UTC)
      // Les marchés US sont UTC-5 (EST) ou UTC-4 (EDT), donc 15h30 EST = 20h30 UTC, 15h30 EDT = 19h30 UTC
      // On considère qu'on est en fin de journée si on est après 19h30 UTC (15h30 EDT) ou 20h30 UTC (15h30 EST)
      const isEndOfDay = segmentEndHour >= 19 && segmentEndMinute >= 30;
      
      // Si on est en fin de journée, ne récupérer que les données de la même date
      // Sinon, récupérer toutes les données pour le symbole (peut inclure plusieurs jours)
      const stockDataQuery = isEndOfDay
        ? this.db
            .select({
              data: schema.stockData.data,
              date: schema.stockData.date
            })
            .from(schema.stockData)
            .where(
              and(
                eq(schema.stockData.symbol, symbol.toUpperCase()),
                eq(schema.stockData.date, segmentDate)
              )
            )
        : this.db
            .select({
              data: schema.stockData.data,
              date: schema.stockData.date
            })
            .from(schema.stockData)
            .where(eq(schema.stockData.symbol, symbol.toUpperCase()))
            .orderBy(schema.stockData.date);

      const allStockData = await stockDataQuery;

      if (allStockData.length === 0) {
        return [];
      }

      // Collecter tous les points avec leurs timestamps
      const allPoints: Array<{ timestamp: string; close: number }> = [];
      
      // Log pour débogage
      console.log(`[getNext30Points] Recherche pour ${symbol}, segmentEnd: ${segmentEndDate.toISOString()}, date: ${segmentDate}`);
      console.log(`[getNext30Points] segmentEndYear: ${segmentEndYear}, Month: ${segmentEndMonth}, Day: ${segmentEndDay}, Hour: ${segmentEndHour}, Minute: ${segmentEndMinute}`);
      console.log(`[getNext30Points] Nombre d'entrées stock_data: ${allStockData.length}`);

      for (const stockData of allStockData) {
        // Les données dans stock_data utilisent les clés '1. open', '2. high', '3. low', '4. close', '5. volume'
        const data = stockData.data as Record<string, Record<string, unknown>>;
        
        let pointsInThisData = 0;
        let pointsAfterSegment = 0;

        // Parcourir tous les points de cette entrée stock_data
        for (const [timestamp, pointData] of Object.entries(data)) {
          try {
            const pointDate = new Date(timestamp);
            
            // Vérifier que la conversion est valide (pas NaN)
            if (isNaN(pointDate.getTime())) {
              console.warn(`Timestamp invalide ignoré: ${timestamp}`);
              continue;
            }
            
            // Extraire le prix close depuis les données (clé '4. close')
            const closePrice = parseFloat((pointData['4. close'] as string) || (pointData['close'] as string) || '0');
            
            if (isNaN(closePrice)) {
              console.warn(`Prix close invalide pour le timestamp ${timestamp}`);
              continue;
            }
            
            pointsInThisData++;
            
            // Extraire jour, heure et minute du point
            const pointYear = pointDate.getUTCFullYear();
            const pointMonth = pointDate.getUTCMonth();
            const pointDay = pointDate.getUTCDate();
            const pointHour = pointDate.getUTCHours();
            const pointMinute = pointDate.getUTCMinutes();
            
            // Si on est en fin de journée, ne garder que les points de la même date
            if (isEndOfDay) {
              if (pointYear !== segmentEndYear || pointMonth !== segmentEndMonth || pointDay !== segmentEndDay) {
                continue;
              }
            }
            
            // Comparer jour, heure et minute (ignorer les secondes)
            // Un point est valide s'il est strictement après segment_end au niveau de la minute
            let isAfter = false;
            
            // Comparer d'abord le jour
            if (pointYear > segmentEndYear) {
              isAfter = true;
            } else if (pointYear === segmentEndYear) {
              if (pointMonth > segmentEndMonth) {
                isAfter = true;
              } else if (pointMonth === segmentEndMonth) {
                if (pointDay > segmentEndDay) {
                  isAfter = true;
                } else if (pointDay === segmentEndDay) {
                  // Même jour : comparer heure et minute
                  if (pointHour > segmentEndHour) {
                    isAfter = true;
                  } else if (pointHour === segmentEndHour) {
                    // Même heure : comparer minute (strictement après)
                    if (pointMinute > segmentEndMinute) {
                      isAfter = true;
                    }
                  }
                }
              }
            }
            
            // Ajouter le point s'il est après segment_end
            if (isAfter) {
              pointsAfterSegment++;
              allPoints.push({
                timestamp,
                close: closePrice
              });
            }
          } catch (error) {
            console.warn(`Erreur lors du traitement du timestamp ${timestamp}:`, error);
            continue;
          }
        }
        
        if (pointsInThisData > 0) {
          console.log(`[getNext30Points] Entrée stock_data date ${stockData.date}: ${pointsInThisData} points totaux, ${pointsAfterSegment} points après segment_end`);
        }
      }
      
      console.log(`[getNext30Points] Total points trouvés après segment_end: ${allPoints.length}`);

      // Trier par timestamp pour garantir l'ordre chronologique
      allPoints.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      // Prendre les 30 premiers points
      return allPoints.slice(0, 30).map(point => point.close);
    } catch (error) {
      console.error('Error fetching next 30 points:', error);
      return [];
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

  static async getAnalysisResultsByStockDataId(stockDataId: string, retries = 3): Promise<AnalysisResult[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.db
          .select()
          .from(schema.analysisResults)
          .where(eq(schema.analysisResults.stockDataId, stockDataId))
          .orderBy(asc(schema.analysisResults.segmentStart));
      } catch (error: any) {
        const isTimeout = error?.code === 'ETIMEDOUT' || 
                         error?.cause?.code === 'ETIMEDOUT' ||
                         error?.message?.includes('fetch failed') ||
                         error?.message?.includes('timeout');
        
        if (isTimeout && attempt < retries) {
          const delay = attempt * 1000; // Délai progressif : 1s, 2s, 3s
          console.warn(`⚠️ Timeout lors de la récupération des segments (tentative ${attempt}/${retries}). Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Si c'est une erreur de connexion et qu'on a épuisé les tentatives, retourner un tableau vide
        // pour permettre à la page de s'afficher quand même
        if (isTimeout) {
          console.error(`❌ Échec de connexion à la base de données après ${retries} tentatives. Retour d'un tableau vide.`);
          return [];
        }
        
        // Pour les autres erreurs, logger et relancer
        console.error('Error fetching analysis results by stock data ID:', error);
        throw new Error('Failed to fetch analysis results by stock data ID');
      }
    }
    
    // Ne devrait jamais arriver ici, mais au cas où
    return [];
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

  /**
   * Récupère tous les résultats d'analyse classés
   * Un résultat est considéré comme classé si :
   * - schemaType = 'R' OU 'V'
   * - patternPoint est NULL OU (patternPoint != 'UNDEFINED' ET patternPoint != 'undefined')
   * - invalid = false (exclut les segments invalides)
   */
  /**
   * Récupère la liste des noms de modèles ML uniques (sans doublons)
   */
  static async getUniqueMlModelNames(): Promise<string[]> {
    try {
      const results = await this.db
        .select({ mlModelName: schema.analysisResults.mlModelName })
        .from(schema.analysisResults)
        .where(
          and(
            isNotNull(schema.analysisResults.mlModelName),
            ne(schema.analysisResults.mlModelName, '')
          )
        );
      
      // Utiliser un Set pour éliminer les doublons
      const uniqueNames = new Set<string>();
      for (const result of results) {
        if (result.mlModelName) {
          uniqueNames.add(result.mlModelName);
        }
      }
      
      return Array.from(uniqueNames).sort();
    } catch (error) {
      console.error('Error fetching unique ML model names:', error);
      throw new Error('Failed to fetch unique ML model names');
    }
  }

  static async getClassifiedAnalysisResults(): Promise<AnalysisResult[]> {
    try {
      return await this.db
        .select()
        .from(schema.analysisResults)
        .where(
          and(
            // schemaType doit être 'R' ou 'V'
            inArray(schema.analysisResults.schemaType, ['R', 'V']),
            // patternPoint doit être NULL ou différent de 'UNDEFINED'/'undefined'
            or(
              isNull(schema.analysisResults.patternPoint),
              and(
                ne(schema.analysisResults.patternPoint, 'UNDEFINED'),
                ne(schema.analysisResults.patternPoint, 'undefined')
              )
            ),
            // Exclure les segments invalides (invalid doit être false)
            eq(schema.analysisResults.invalid, false)
          )
        )
        .orderBy(desc(schema.analysisResults.schemaType), desc(schema.analysisResults.createdAt));
    } catch (error) {
      console.error('Error fetching classified analysis results:', error);
      throw new Error('Failed to fetch classified analysis results');
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
      mlResult?: 'TRUE' | 'FALSE' | 'UNCLASSIFIED';
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
      
      if (updateData.mlResult !== undefined) {
        updateFields.mlResult = updateData.mlResult;
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
      // Exclure les segments invalides de toutes les statistiques
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
        .from(schema.analysisResults)
        .where(eq(schema.analysisResults.invalid, false));
      
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
