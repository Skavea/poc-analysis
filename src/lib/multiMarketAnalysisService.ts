/**
 * Multi-Market Analysis Service
 * =============================
 * 
 * Service étendu pour gérer différents types de marchés financiers :
 * - Actions (STOCK)
 * - Cryptomonnaies (CRYPTOCURRENCY)
 * - Matières premières (COMMODITY)
 * - Indices (INDEX)
 * 
 * Implémente la logique de récupération et d'analyse pour chaque type de marché
 */

import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import { StockAnalysisService } from './stockAnalysisService';
import { MarketType } from './schema';
import { config } from 'dotenv';

config({ path: '.env' });


// Database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(databaseUrl);

export class MultiMarketAnalysisService extends StockAnalysisService {
  constructor() {
    super();
  }


  /**
   * Extrait la date des données API selon le type de marché
   */
  private extractDateFromMarketData(data: Record<string, unknown>, marketType: MarketType): string {
    const timestamps = Object.keys(data);
    if (timestamps.length === 0) {
      throw new Error(`No timestamps found in ${marketType} API data`);
    }
    
    // Trier les timestamps pour trouver la plus récente
    const sortedTimestamps = timestamps.sort();
    const mostRecentTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
    
    // Extraire la date du timestamp
    const date = new Date(mostRecentTimestamp).toISOString().split('T')[0];
    
    console.log(`📅 Date extraite des données ${marketType}: ${date} (timestamp le plus récent: ${mostRecentTimestamp})`);
    
    return date;
  }

  /**
   * Sauvegarde les données de marché avec market_type et date correcte
   */
  async saveMarketData(
    symbol: string, 
    marketType: MarketType, 
    data: Record<string, unknown>
  ): Promise<string> {
    const totalPoints = Object.keys(data).length;
    
    // Extraire la date des données API selon le type de marché
    const date = this.extractDateFromMarketData(data, marketType);
    const id = `${symbol.toUpperCase()}_${date}`;

    console.log(`💾 Sauvegarde des données ${marketType} pour ${symbol} avec date: ${date}`);

    await sql`
      INSERT INTO stock_data (id, symbol, date, data, total_points, market_type)
      VALUES (${id}, ${symbol.toUpperCase()}, ${date}, ${JSON.stringify(data)}, ${totalPoints}, ${marketType})
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        total_points = EXCLUDED.total_points,
        created_at = CURRENT_TIMESTAMP
    `;
    
    return id;
  }

  /**
   * Sauvegarde les données de marché avec un ID spécifique (pour éviter les conflits)
   */
  async saveMarketDataWithId(
    symbol: string,
    marketType: MarketType,
    data: Record<string, unknown>,
    id: string
  ): Promise<string> {
    const totalPoints = Object.keys(data).length;
    
    // Extraire la date des données
    const timestamps = Object.keys(data).sort();
    const mostRecentTimestamp = timestamps[timestamps.length - 1];
    const date = new Date(mostRecentTimestamp).toISOString().split('T')[0];

    console.log(`💾 Sauvegarde des données ${marketType} pour ${symbol} avec ID: ${id}`);

    await sql`
      INSERT INTO stock_data (id, symbol, date, data, total_points, market_type)
      VALUES (${id}, ${symbol.toUpperCase()}, ${date}, ${JSON.stringify(data)}, ${totalPoints}, ${marketType})
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        total_points = EXCLUDED.total_points,
        created_at = CURRENT_TIMESTAMP
    `;
    
    return id;
  }

  /**
   * Vérifie les chevauchements et prépare les données à sauvegarder
   * Retourne les données à sauvegarder (sans chevauchement) et le nombre de segments réduits
   */
  async checkAndHandleOverlap(
    symbol: string,
    newData: Record<string, unknown>
  ): Promise<{ dataToSave: Record<string, unknown>, reducedExistingSegments: number }> {
    // Récupérer tous les segments existants pour ce symbole
    const existingSegments = await sql`
      SELECT 
        ar.id,
        ar.segment_start,
        ar.segment_end,
        ar.stock_data_id
      FROM analysis_results ar
      WHERE ar.symbol = ${symbol.toUpperCase()}
      ORDER BY ar.segment_start
    `;

    if (existingSegments.length === 0) {
      // Aucun segment existant, sauvegarder toutes les nouvelles données
      return { dataToSave: newData, reducedExistingSegments: 0 };
    }

    // Extraire les timestamps de toutes les données existantes
    const existingTimestamps = new Set<string>();
    for (const segment of existingSegments) {
      const timestamps = await this.getTimestampsFromSegments(segment.id, segment.stock_data_id);
      timestamps.forEach(ts => existingTimestamps.add(ts));
    }

    // Filtrer les nouvelles données pour ne garder que celles qui n'existent pas déjà
    const newTimestamps = Object.keys(newData).sort();
    const dataToSave: Record<string, unknown> = {};
    let overlapCount = 0;
    
    for (const timestamp of newTimestamps) {
      if (!existingTimestamps.has(timestamp)) {
        dataToSave[timestamp] = newData[timestamp];
      } else {
        overlapCount++;
      }
    }

    console.log(`📊 Nouvelles données: ${newTimestamps.length} points, Chevauchements: ${overlapCount}, Points à sauvegarder: ${Object.keys(dataToSave).length}`);

    // Si toutes les données sont en chevauchement, retourner vide
    if (Object.keys(dataToSave).length === 0) {
      return { dataToSave: {}, reducedExistingSegments: 0 };
    }

    // Vérifier si les nouvelles données créent un chevauchement temporel avec les segments existants
    const newDataStart = new Date(newTimestamps[0]);
    const newDataEnd = new Date(newTimestamps[newTimestamps.length - 1]);
    
    let reducedSegments = 0;
    
    for (const segment of existingSegments) {
      const segmentStart = new Date(segment.segment_start);
      const segmentEnd = new Date(segment.segment_end);
      
      // Vérifier si il y a un chevauchement temporel
      if ((newDataStart <= segmentEnd && newDataEnd >= segmentStart)) {
        // Il y a chevauchement, réduire le segment existant
        reducedSegments++;
        await this.reduceSegmentForOverlap(segment.id, newDataStart, newDataEnd);
      }
    }

    return { dataToSave, reducedExistingSegments: reducedSegments };
  }

  /**
   * Récupère les timestamps d'un segment depuis la base de données
   */
  private async getTimestampsFromSegments(segmentId: string, stockDataId: string): Promise<string[]> {
    // Récupérer le segment
    const segment = await sql`
      SELECT points_data 
      FROM analysis_results 
      WHERE id = ${segmentId}
    `;

    if (segment.length === 0 || !segment[0].points_data) {
      return [];
    }

    const pointsData = segment[0].points_data as Array<{ timestamp: string }>;
    return pointsData.map(p => p.timestamp);
  }

  /**
   * Réduit un segment existant pour éviter le chevauchement avec les nouvelles données
   */
  private async reduceSegmentForOverlap(
    segmentId: string,
    newDataStart: Date,
    newDataEnd: Date
  ): Promise<void> {
    // Récupérer le segment actuel
    const segment = await sql`
      SELECT points_data 
      FROM analysis_results 
      WHERE id = ${segmentId}
    `;

    if (segment.length === 0 || !segment[0].points_data) {
      return;
    }

    const pointsData = segment[0].points_data as Array<{ timestamp: string }>;
    
    // Filtrer les points qui ne chevauchent pas avec les nouvelles données
    const filteredPoints = pointsData.filter(point => {
      const pointDate = new Date(point.timestamp);
      return pointDate < newDataStart || pointDate > newDataEnd;
    });

    // Si on a moins de 6 points après filtrage, supprimer le segment
    if (filteredPoints.length < 6) {
      console.log(`⚠️ Suppression du segment ${segmentId} (moins de 6 points après réduction)`);
      await sql`DELETE FROM analysis_results WHERE id = ${segmentId}`;
      return;
    }

    // Mettre à jour le segment avec les points filtrés
    const updatedPointsData = filteredPoints.map(point => ({
      ...point,
      ...pointsData.find(p => p.timestamp === point.timestamp)
    }));

    // Mettre à jour le segment dans la base de données
    await sql`
      UPDATE analysis_results 
      SET 
        points_data = ${JSON.stringify(updatedPointsData)},
        point_count = ${updatedPointsData.length}
      WHERE id = ${segmentId}
    `;

    console.log(`📉 Segment ${segmentId} réduit: ${pointsData.length} -> ${updatedPointsData.length} points`);
  }

  /**
   * Sauvegarde les résultats d'analyse AVEC symbol et date + référence vers stock_data
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


}
