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
    redPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    greenPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    redPointCount: number;
    greenPointCount: number;
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
    redPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    greenPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    redPointCount: number;
    greenPointCount: number;
  }> {
    const segments: Array<{
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
      redPointsData: Array<{
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;
      greenPointsData: Array<{
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;
      redPointCount: number;
      greenPointCount: number;
    }> = [];
    const segmentDuration = 90; // 90 minutes
    const maxSegmentsPerDay = 10; // Maximum segments per day

    // Sort timestamps
    timestamps.sort();

    // Extract continuous segments with 1-minute steps
    const stepSize = 1; // 1 minute step for continuous segments
    

    let currentIndex = 0;
    
    // Boucle principale : continuer tant qu'on peut créer des segments
    while (currentIndex < timestamps.length && segments.length < maxSegmentsPerDay) {
      // Vérifier qu'il reste assez de points pour un segment minimum
      if (currentIndex + 6 > timestamps.length) {
        break; // Pas assez de points restants
      }
      
      // Prendre une plage initiale de segmentDuration minutes
      const segmentTimestamps = timestamps.slice(currentIndex, currentIndex + segmentDuration);
      
      if (segmentTimestamps.length < 6) {
        // Pas assez de points, avancer et continuer
        currentIndex += stepSize;
        continue;
      }
      
      // Déterminer la fin de la plage traitée
      let endTimestamp: string;
      let segmentCreated = false;
      
      // CRITIQUE: Si on a déjà des segments, on doit commencer exactement après le dernier
      let effectiveStartTimestamps = segmentTimestamps;
      
      if (segments.length > 0) {
        // Le segment précédent s'est terminé à la fin de segments[length-1]
        // On doit trouver les timestamps qui commencent exactement après
        const lastSegmentEnd = segments[segments.length - 1].segmentEnd;
        const lastEndTime = new Date(lastSegmentEnd);
        const nextRequiredStart = new Date(lastEndTime.getTime() + 60000); // +1 minute
        
        // Trouver le premier timestamp >= nextRequiredStart
        let actualStartIndex = currentIndex;
        for (let i = currentIndex; i < timestamps.length; i++) {
          const ts = new Date(timestamps[i]);
          if (ts.getTime() >= nextRequiredStart.getTime() - 5000) { // Tolérance 5s
            actualStartIndex = i;
            break;
          }
        }
        
        // Ajuster la plage du segment pour commencer au bon endroit
        if (actualStartIndex !== currentIndex) {
          effectiveStartTimestamps = timestamps.slice(actualStartIndex, actualStartIndex + segmentDuration);
          console.log(`[DEBUG] Ajustement pour continuité: début initial=${segmentTimestamps[0]}, début ajusté=${effectiveStartTimestamps[0]}`);
        }
        
        // Si on n'a pas assez de points après ajustement, essayer de prendre ce qu'on peut
        if (effectiveStartTimestamps.length < 6) {
          // Prendre tous les points disponibles jusqu'à la fin
          effectiveStartTimestamps = timestamps.slice(actualStartIndex);
          if (effectiveStartTimestamps.length < 6) {
            // Pas assez de points, passer à la suite
            endTimestamp = timestamps[timestamps.length - 1];
            currentIndex = timestamps.length; // Forcer la fin de la boucle
            console.log(`[DEBUG] Plus assez de points après ajustement (${effectiveStartTimestamps.length} points)`);
            break;
          }
        }
      }
      
      // Toujours essayer de créer un segment, même si la plage initiale n'est pas parfaitement continue
      // processSegment gérera le redimensionnement si nécessaire
      // Passer tous les timestamps du jour pour l'expansion
      const segmentData = this.processSegment(symbol, date, effectiveStartTimestamps, data, timestamps);
      
      if (segmentData) {
        // Segment créé avec succès (même après redimensionnement)
        segments.push(segmentData);
        segmentCreated = true;
        // CRUCIAL: Utiliser la fin réelle du segment APRÈS redimensionnement
        endTimestamp = segmentData.segmentEnd;
        console.log(`[DEBUG] Segment créé: currentIndex=${currentIndex}, début initial=${effectiveStartTimestamps[0]}, début réel=${segmentData.segmentStart}, fin initiale=${effectiveStartTimestamps[effectiveStartTimestamps.length - 1]}, fin réelle=${endTimestamp}`);
      } else {
        // Si la création a échoué, utiliser la fin de la plage initiale
        endTimestamp = effectiveStartTimestamps[effectiveStartTimestamps.length - 1];
        console.log(`[DEBUG] Segment échoué: currentIndex=${currentIndex}, début=${effectiveStartTimestamps[0]}, fin=${endTimestamp}`);
      }
      
      // ÉTAPE 1: Trouver l'index exact de endTimestamp dans le tableau timestamps
      // C'est crucial pour savoir où on en est réellement après redimensionnement
      const endTime = new Date(endTimestamp);
      const endTimeMs = endTime.getTime();
      let endTimestampIndex = -1;
      
      // Chercher endTimestamp dans le tableau (peut être avant currentIndex + segmentDuration si redimensionné)
      for (let i = 0; i < timestamps.length; i++) {
        const candidateTime = new Date(timestamps[i]);
        const candidateTimeMs = candidateTime.getTime();
        
        // Correspondance exacte (tolérance de 1 seconde pour les arrondis)
        if (Math.abs(candidateTimeMs - endTimeMs) <= 1000) {
          endTimestampIndex = i;
          break;
        }
      }
      
      // Si pas trouvé exactement, prendre le premier >= endTimestamp
      if (endTimestampIndex === -1) {
        for (let i = 0; i < timestamps.length; i++) {
          const candidateTime = new Date(timestamps[i]);
          if (candidateTime.getTime() >= endTimeMs) {
            endTimestampIndex = i;
            break;
          }
        }
      }
      
      // Vérifier qu'on a trouvé endTimestamp et qu'il reste assez de points pour un segment
      if (endTimestampIndex === -1) {
        console.log(`[DEBUG] Fin: endTimestamp ${endTimestamp} non trouvé dans les timestamps du jour`);
        break;
      }
      
      // Si on est au dernier élément ou qu'il reste moins de 6 points, arrêter
      if (endTimestampIndex >= timestamps.length - 1 || timestamps.length - endTimestampIndex - 1 < 6) {
        console.log(`[DEBUG] Fin: Plus assez de points après endTimestamp (idx ${endTimestampIndex}, reste ${timestamps.length - endTimestampIndex - 1} points)`);
        break;
      }
      
      // ÉTAPE 2: Le prochain segment doit commencer exactement à la minute +1 après endTimestamp
      // Pour garantir la continuité temporelle, le prochain segment doit commencer à endTimestamp + 1 minute
      const nextStartTime = new Date(endTimeMs + 60000); // +1 minute exactement
      const nextStartTimeMs = nextStartTime.getTime();
      
      // ÉTAPE 3: Chercher le prochain timestamp
      // CRITIQUE: Pour garantir la continuité, on cherche le premier timestamp >= nextStartTime
      // Même s'il y a un gap dans les données, on doit commencer le prochain segment au premier timestamp disponible
      // IMPORTANT: chercher à partir de endTimestampIndex + 1 pour garantir qu'on avance toujours
      let nextIndex = -1;
      
      // Chercher le premier timestamp >= nextStartTime 
      // Si aucun timestamp exact n'existe à nextStartTime (gap dans les données),
      // on prend le premier timestamp disponible après nextStartTime pour garantir la continuité
      for (let i = endTimestampIndex + 1; i < timestamps.length; i++) {
        const candidateTime = new Date(timestamps[i]);
        const candidateTimeMs = candidateTime.getTime();
        
        // Accepter si >= nextStartTime (tolérance de 5 secondes pour les arrondis)
        if (candidateTimeMs >= nextStartTimeMs - 5000) {
          nextIndex = i;
          break;
        }
      }
      
      console.log(`[DEBUG] Segment: début=${segmentTimestamps[0]}, fin=${endTimestamp} (idx ${endTimestampIndex}), nextStartTime=${nextStartTime.toISOString()}, nextIndex=${nextIndex}`);
      
      // Si on n'a pas trouvé, arrêter
      if (nextIndex === -1) {
        console.log(`[DEBUG] Aucun timestamp trouvé après ${nextStartTime.toISOString()}`);
        break;
      }
      
      // Vérifier que le timestamp trouvé est bien dans la minute suivante (ou très proche)
      const foundTime = new Date(timestamps[nextIndex]);
      const gapMinutes = Math.round((foundTime.getTime() - endTimeMs) / 60000);
      if (gapMinutes > 1) {
        console.log(`[DEBUG] ATTENTION: Gap de ${gapMinutes} minutes entre segments (de ${endTimestamp} à ${timestamps[nextIndex]})`);
      }
      
      // Vérifier qu'on avance bien
      if (nextIndex <= currentIndex) {
        console.log(`[DEBUG] AVERTISSEMENT: nextIndex (${nextIndex}) <= currentIndex (${currentIndex}), force l'avancement`);
        nextIndex = currentIndex + segmentDuration; // Au minimum, sauter le segment initial
        if (nextIndex >= timestamps.length) {
          break;
        }
      }
      
      // Passer au prochain segment
      const oldIndex = currentIndex;
      currentIndex = nextIndex;
      console.log(`[DEBUG] Avancement: ${oldIndex} -> ${currentIndex} (${timestamps[currentIndex]})`);
    }

    // Log final: afficher tous les segments créés pour vérifier la continuité
    if (segments.length > 0) {
      console.log(`[DEBUG] ${segments.length} segments créés pour ${date}:`);
      segments.forEach((seg, idx) => {
        const start = new Date(seg.segmentStart).toISOString().substring(11, 16);
        const end = new Date(seg.segmentEnd).toISOString().substring(11, 16);
        const gap = idx > 0 ? 
          Math.round((new Date(seg.segmentStart).getTime() - new Date(segments[idx-1].segmentEnd).getTime()) / 60000) : 0;
        console.log(`  ${idx+1}. ${start} - ${end} (${seg.pointCount} pts)${idx > 0 ? ` - gap: ${gap} min` : ''}`);
      });
    }

    return segments;
  }

  /**
   * Check if a segment has continuous timestamps with 1-minute intervals
   */
  private isContinuousSegment(timestamps: string[]): boolean {
    if (timestamps.length < 2) return false;
    
    for (let i = 0; i < timestamps.length - 1; i++) {
      const current = new Date(timestamps[i]);
      const next = new Date(timestamps[i + 1]);
      
      // Check if the difference is exactly 1 minute (60000 ms)
      const timeDiff = next.getTime() - current.getTime();
      if (Math.abs(timeDiff - 60000) > 1000) { // Allow 1 second tolerance
        return false;
      }
    }
    
    return true;
  }

  /**
   * Process a single segment through analysis and filtering
   * 
   * The processing follows these steps:
   * 1. Calculate initial metrics (min, max, average, trend)
   * 2. Apply advanced filtering to create two point sets:
   *    - redPointsData: Remove plateaus and constant derivative regions
   *    - greenPointsData: Keep only peaks and plateau extremities
   * 3. Validate segment meets requirements (6-50 filtered points, 4+ peak points, 6+ in region)
   * 4. Adjust segment size if validation fails
   */
  protected processSegment(
    symbol: string, 
    date: string, 
    timestamps: string[], 
    data: Record<string, unknown>,
    availableTimestamps?: string[] // Timestamps disponibles pour l'expansion (par jour)
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
    redPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    greenPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    redPointCount: number;
    greenPointCount: number;
    blackPointsCount: number;
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
    
    
    // Step 2: Apply advanced filtering to create two point sets
    const { redPoints, greenPoints } = this.applyAdvancedFiltering(timestamps, prices, data);
    
    // Step 3: Validate and adjust segment if needed
    let finalTimestamps = timestamps;
    let finalRedPoints = redPoints;
    let finalGreenPoints = greenPoints;
    
    // Create original points for validation
    let originalPoints = timestamps.map(ts => {
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

    // Check validation criteria and adjust if needed
    const validation = this.validateSegment(finalRedPoints, finalGreenPoints, x0, averagePrice, trendDirection, originalPoints);
    
    if (!validation.isValid) {
      
      // Try to adjust segment by removing oldest points
      // Utiliser availableTimestamps si fourni (timestamps du jour), sinon tous les timestamps de data
      const timestampsForExpansion = availableTimestamps || Object.keys(data).sort();
      const adjustmentResult = this.adjustSegmentSize(timestamps, prices, data, validation, timestampsForExpansion);
      if (adjustmentResult) {
        finalTimestamps = adjustmentResult.timestamps;
        finalRedPoints = adjustmentResult.redPoints;
        finalGreenPoints = adjustmentResult.greenPoints;
        
        // Recalculate original points (points_data) with the adjusted timestamps
        // This represents ALL points in the segment after adjustment
        originalPoints = finalTimestamps.map(ts => {
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
        
      } else {
        return null;
      }
    } else {
    }

    // Step 4: Recalculate final metrics
    const finalPrices = finalTimestamps.map(ts => parseFloat((data[ts] as Record<string, unknown>)['4. close'] as string));
    const finalX0 = finalPrices[finalPrices.length - 1];
    const finalMinPrice = Math.min(...finalPrices);
    const finalMaxPrice = Math.max(...finalPrices);
    const finalAveragePrice = (finalMinPrice + finalMaxPrice) / 2;
    const finalTrendDirection: 'UP' | 'DOWN' = finalX0 > finalAveragePrice ? 'UP' : 'DOWN';
    
    // Count final points in region using the updated original points (after adjustment if needed)
    const finalPointsInRegion = originalPoints.filter(point => {
      if (finalTrendDirection === 'UP') {
        return point.close > finalAveragePrice;
      } else {
        return point.close < finalAveragePrice;
      }
    }).length;
    
    // Final validation check - adjustSegmentSize should have handled all adjustments
    // This is just a safety check
    const finalValidation = this.validateSegment(finalRedPoints, finalGreenPoints, finalX0, finalAveragePrice, finalTrendDirection, originalPoints);
    
    if (!finalValidation.isValid) {
      // Check for opposite invalid rules (only reason to reject)
      const deviations = {
        redPoints: finalRedPoints.length - 6,
        redPointsMax: finalRedPoints.length - 50,
        greenPoints: finalGreenPoints.length - 4,
        pointsInRegion: finalPointsInRegion - 6,
        pointsInRegionMax: finalPointsInRegion - 50,
      };
      
      if (this.hasOppositeInvalidRules(deviations)) {
        return null;
      }
      
      // If adjustment was attempted but still invalid (and not opposite), log warning
      // but still try to create the segment (adjustSegmentSize should have converged)
    }
    
    // Create segment data from final timestamps
    const pointsData = finalTimestamps.map(ts => {
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

    // Generate a unique ID
    const segmentId = `${symbol}_${date}_${uuidv4().substring(0, 8)}`;

    // Calculate black points count (variations strictes + 1)
    const blackPointsCount = this.calculateBlackPointsCount(finalPrices);
    
    // Debug: Log pour vérifier le calcul (à retirer après validation)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Black Points Debug] Segment ${segmentId}:`, {
        prices: finalPrices.slice(0, 10).map(p => p.toFixed(2)), // Premiers 10 prix
        totalPrices: finalPrices.length,
        blackPointsCount
      });
    }
    
    return {
      id: segmentId,
      symbol: symbol.toUpperCase(),
      date,
      segmentStart: finalTimestamps[0],
      segmentEnd: finalTimestamps[finalTimestamps.length - 1],
      pointCount: finalTimestamps.length,
      x0: finalX0,
      minPrice: finalMinPrice,
      maxPrice: finalMaxPrice,
      averagePrice: finalAveragePrice,
      trendDirection: finalTrendDirection,
      pointsData,
      originalPointCount,
      pointsInRegion: finalPointsInRegion,
      redPointsData: finalRedPoints,
      greenPointsData: finalGreenPoints,
      redPointCount: finalRedPoints.length,
      greenPointCount: finalGreenPoints.length,
      blackPointsCount
    };
  }

  /**
   * Calcule le nombre de points noirs (variations strictes + 1)
   * Une variation stricte est un changement de direction dans les prix.
   * Les plateaux (variations = 0) sont ignorés : si on est en croissance et qu'on a un plateau
   * suivi de croissance, on ne compte pas de variation. Si le plateau est suivi de décroissance,
   * on compte une variation.
   * 
   * Les points noirs sont comptés comme suit :
   * - Chaque changement de direction (croissance ↔ décroissance) = 1 variation stricte
   * - Le premier point et le dernier point sont toujours des points noirs
   * - Donc : nombre de points noirs = nombre de changements de direction + 2
   * 
   * Exemples:
   * - [100, 102, 103, 101] -> variations: [+2, +1, -2] -> 1 changement strict -> 3 points noirs (premier, changement, dernier)
   * - [100, 102, 102, 102, 103] -> variations: [+2, 0, 0, +1] -> filtré: [+2, +1] -> 0 changement -> 2 points noirs (premier et dernier)
   * - [100, 102, 102, 102, 101] -> variations: [+2, 0, 0, -1] -> filtré: [+2, -1] -> 1 changement -> 3 points noirs (premier, changement, dernier)
   * - [100, 98, 96, 97, 99] -> variations: [-2, -2, +1, +2] -> filtré: [-2, -2, +1, +2] -> 1 changement -> 3 points noirs (premier, changement, dernier)
   * 
   * @param prices Tableau des prix dans l'ordre chronologique
   * @returns Nombre de points noirs (nombre de variations strictes + 2)
   */
  private calculateBlackPointsCount(prices: number[]): number {
    // Si on a 0 ou 1 point, le nombre de points noirs = nombre de points
    if (prices.length <= 1) {
      return prices.length;
    }

    // Calculer les variations entre points consécutifs
    const variations: number[] = [];
    for (let i = 0; i < prices.length - 1; i++) {
      variations.push(prices[i + 1] - prices[i]);
    }

    if (variations.length < 1) {
      return 1; // Au moins 1 point noir si on a des points
    }

    // Filtrer les variations nulles (plateaux) pour ne garder que les variations non nulles
    // Un plateau ne compte pas comme changement de direction s'il est suivi de la même direction
    // On construit une séquence de directions (sans tenir compte des zéros)
    const nonZeroVariations: number[] = [];
    for (const variation of variations) {
      if (variation !== 0) {
        nonZeroVariations.push(variation);
      }
      // Si variation === 0, on l'ignore complètement (comme si le point n'existait pas)
    }

    // Si on n'a aucune variation non nulle, tous les prix sont égaux -> 2 points noirs (premier et dernier)
    if (nonZeroVariations.length === 0) {
      return 2;
    }

    // Si on n'a qu'une seule variation non nulle, pas de changement de direction -> 2 points noirs (premier et dernier)
    if (nonZeroVariations.length === 1) {
      return 2;
    }

    // Compter les changements de signe entre variations non nulles consécutives
    // Un changement de signe correspond à un changement de direction (croissance ↔ décroissance)
    let strictVariationsCount = 0;
    for (let i = 0; i < nonZeroVariations.length - 1; i++) {
      const variation1 = nonZeroVariations[i];
      const variation2 = nonZeroVariations[i + 1];
      
      // Changement de signe strict = variation stricte
      // De positif strict à négatif strict ou vice versa
      // Note: On ne compte pas 0 car on les a déjà filtrés
      if ((variation1 > 0 && variation2 < 0) || (variation1 < 0 && variation2 > 0)) {
        strictVariationsCount++;
      }
    }

    // Nombre de points noirs = nombre de changements de direction + 2
    // Le premier point et le dernier point sont toujours des points noirs
    // Chaque changement de direction crée également un nouveau point noir
    const result = strictVariationsCount + 2;
    
    // Debug: Log détaillé pour comprendre le calcul
    if (process.env.NODE_ENV === 'development' && prices.length <= 20) {
      console.log(`[Black Points Calc] Prix: [${prices.map(p => p.toFixed(2)).join(', ')}]`);
      console.log(`[Black Points Calc] Variations: [${variations.map(v => v.toFixed(2)).join(', ')}]`);
      console.log(`[Black Points Calc] Variations non nulles: [${nonZeroVariations.map(v => v.toFixed(2)).join(', ')}]`);
      console.log(`[Black Points Calc] Changements de direction: ${strictVariationsCount}, Points noirs: ${result}`);
    }
    
    return result;
  }

  /**
   * Apply advanced filtering to create two point sets according to the new rules
   */
  private applyAdvancedFiltering(
    timestamps: string[], 
    prices: number[], 
    data: Record<string, unknown>
  ): {
    redPoints: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    greenPoints: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  } {
    // Create point objects with all data
    const points = timestamps.map(ts => {
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

    // Step 1: Create red points (remove plateaus and constant derivative regions)
    const redIndices = this.getRedIndices(prices);
    const redPoints = redIndices.map(idx => points[idx]);

    // Step 2: Create green points FROM red points (subset of red points)
    // Green points are calculated from the red points, not from all points
    const redPrices = redIndices.map(idx => prices[idx]);
    const greenIndicesInRed = this.getGreenIndices(redPrices);
    
    // Map back to original indices
    const greenIndices = greenIndicesInRed.map(idxInRed => redIndices[idxInRed]);
    const greenPoints = greenIndices.map(idx => points[idx]);

    return { redPoints, greenPoints };
  }

  /**
   * Get indices for red points (remove plateaus and constant derivative regions)
   * Keeps ALL points EXCEPT those in the middle of:
   * - Plateaus (3+ consecutive identical prices) - keep only extremities
   * - Constant derivative regions (3+ points forming a straight line) - keep only extremities
   */
  private getRedIndices(prices: number[]): number[] {
    // Start by keeping all indices
    const keepIndices = new Set<number>(Array.from({ length: prices.length }, (_, i) => i));
    const removeIndices = new Set<number>();
    
    // Step 1: Identify and remove middle points of plateaus (3+ identical prices)
    for (let i = 0; i < prices.length - 2; i++) {
      if (prices[i] === prices[i+1] && prices[i+1] === prices[i+2]) {
        // Find plateau end
        let plateauEnd = i + 2;
        while (plateauEnd < prices.length - 1 && prices[plateauEnd] === prices[plateauEnd + 1]) {
          plateauEnd++;
        }
        
        // Remove middle points of plateau (keep first and last)
        for (let j = i + 1; j < plateauEnd; j++) {
          removeIndices.add(j);
        }
        
        // Skip to end of plateau
        i = plateauEnd - 1; // Will be incremented by for loop
      }
    }
    
    // Step 2: Identify and remove middle points of constant derivative regions
    for (let i = 0; i < prices.length - 2; i++) {
      // Skip if already marked for removal (in a plateau)
      if (removeIndices.has(i) || removeIndices.has(i+1) || removeIndices.has(i+2)) {
        continue;
      }
      
      const derivative1 = prices[i+1] - prices[i];
      const derivative2 = prices[i+2] - prices[i+1];
      
      // Check if derivatives are equal (constant rate of change = straight line)
      if (Math.abs(derivative1 - derivative2) < 0.0001 && Math.abs(derivative1) > 0.0001) {
        // Find region end
        let regionEnd = i + 2;
        while (regionEnd < prices.length - 1) {
          // Skip if already marked for removal
          if (removeIndices.has(regionEnd) || removeIndices.has(regionEnd + 1)) {
            break;
          }
          
          const nextDerivative = prices[regionEnd + 1] - prices[regionEnd];
          if (Math.abs(derivative1 - nextDerivative) > 0.0001) break;
          regionEnd++;
        }
        
        // Remove middle points of constant derivative region (keep first and last)
        for (let j = i + 1; j < regionEnd; j++) {
          removeIndices.add(j);
        }
        
        // Skip to end of region
        i = regionEnd - 1; // Will be incremented by for loop
      }
    }
    
    // Build result: all indices except those marked for removal
    const result: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (!removeIndices.has(i)) {
        result.push(i);
      }
    }
    
    // Always ensure first and last are included
    if (result[0] !== 0) result.unshift(0);
    if (result[result.length - 1] !== prices.length - 1) result.push(prices.length - 1);
    
    return result.sort((a, b) => a - b);
  }

  /**
   * Get indices for green points from red points
   * Remove all points INSIDE strictly increasing or strictly decreasing sequences.
   * 
   * Example: [610, 609.4, 609.2] -> keep only [610, 609.2] (strictly decreasing)
   * Example: [100, 101, 102, 103] -> keep only [100, 103] (strictly increasing)
   * 
   * Règle: Pour toute séquence de 3 points consécutifs strictement monotones,
   * on supprime le point du milieu. Les plateaux (prix identiques) sont conservés.
   * 
   * Algorithme: Parcourir tous les triplets consécutifs (i, i+1, i+2) et 
   * marquer i+1 pour suppression si la séquence est strictement monotone.
   */
  private getGreenIndices(redPrices: number[]): number[] {
    if (redPrices.length < 2) {
      return redPrices.map((_, i) => i);
    }
    
    if (redPrices.length === 2) {
      return [0, 1];
    }
    
    // Marquer les indices à supprimer (points à l'intérieur de séquences strictement monotones)
    const remove = new Set<number>();
    
    // Parcourir tous les triplets consécutifs
    for (let i = 0; i < redPrices.length - 2; i++) {
      const p1 = redPrices[i];
      const p2 = redPrices[i + 1];
      const p3 = redPrices[i + 2];
      
      // Vérifier si c'est une séquence strictement monotone
      // Strictement croissante: p1 < p2 < p3
      const isStrictlyIncreasing = p1 < p2 && p2 < p3;
      // Strictement décroissante: p1 > p2 > p3
      const isStrictlyDecreasing = p1 > p2 && p2 > p3;
      
      // Si c'est strictement monotone, marquer le point du milieu pour suppression
      if (isStrictlyIncreasing || isStrictlyDecreasing) {
        remove.add(i + 1);
      }
      
      // Ne pas gérer les plateaux ici (ils sont déjà gérés par getRedIndices)
    }
    
    // Pour les séquences plus longues, il faut aussi supprimer les points intermédiaires
    // Par exemple [100, 101, 102, 103] doit donner [100, 103]
    // On utilise une approche itérative : on itère jusqu'à ce qu'aucun point ne soit supprimé
    let changed = true;
    while (changed) {
      changed = false;
      
      // Parcourir tous les points restants (non supprimés) pour trouver des séquences
      const currentIndices: number[] = [];
      for (let i = 0; i < redPrices.length; i++) {
        if (!remove.has(i)) {
          currentIndices.push(i);
        }
      }
      
      // Vérifier chaque triplet de points consécutifs dans la liste actuelle
      for (let j = 0; j < currentIndices.length - 2; j++) {
        const idx1 = currentIndices[j];
        const idx2 = currentIndices[j + 1];
        const idx3 = currentIndices[j + 2];
        
        // Si ces indices sont consécutifs dans le tableau original
        // et forment une séquence strictement monotone, supprimer le point du milieu
        if (idx2 === idx1 + 1 && idx3 === idx2 + 1) {
          const p1 = redPrices[idx1];
          const p2 = redPrices[idx2];
          const p3 = redPrices[idx3];
          
          const isStrictlyIncreasing = p1 < p2 && p2 < p3;
          const isStrictlyDecreasing = p1 > p2 && p2 > p3;
          
          if ((isStrictlyIncreasing || isStrictlyDecreasing) && !remove.has(idx2)) {
            remove.add(idx2);
            changed = true;
          }
        }
      }
    }
    
    // Construire le résultat : tous les indices sauf ceux marqués pour suppression
    const result: number[] = [];
    for (let idx = 0; idx < redPrices.length; idx++) {
      if (!remove.has(idx)) {
        result.push(idx);
      }
    }
    
    // S'assurer que le premier et le dernier point sont toujours inclus
    if (result.length === 0 || result[0] !== 0) {
      result.unshift(0);
    }
    if (result.length === 0 || result[result.length - 1] !== redPrices.length - 1) {
      result.push(redPrices.length - 1);
    }
    
    // Retirer les doublons et trier
    const final = Array.from(new Set(result)).sort((a, b) => a - b);
    
    return final;
  }

  /**
   * Validate segment meets requirements
   */
  private validateSegment(
    redPoints: Array<any>,
    greenPoints: Array<any>,
    x0: number,
    averagePrice: number,
    trendDirection: 'UP' | 'DOWN',
    originalPoints?: Array<any> // Points originaux du segment
  ): { isValid: boolean; reason: string } {
    const redCount = redPoints.length;
    const greenCount = greenPoints.length;
    
    // Check red points count (6-50)
    if (redCount < 6) {
      return { isValid: false, reason: `Too few red points: ${redCount} < 6` };
    }
    if (redCount > 50) {
      return { isValid: false, reason: `Too many red points: ${redCount} > 50` };
    }
    
    // Check green points count (4+)
    if (greenCount < 4) {
      return { isValid: false, reason: `Too few green points: ${greenCount} < 4` };
    }
    
    // Check points in region (6-50) - use original points if available
    const pointsToCheck = originalPoints || redPoints;
    const pointsInRegion = pointsToCheck.filter(point => {
      if (trendDirection === 'UP') {
        return point.close > averagePrice;
      } else {
        return point.close < averagePrice;
      }
    }).length;
    
    
    if (pointsInRegion < 6) {
      return { isValid: false, reason: `Too few points in region: ${pointsInRegion} < 6` };
    }
    if (pointsInRegion > 50) {
      return { isValid: false, reason: `Too many points in region: ${pointsInRegion} > 50` };
    }
    
    return { isValid: true, reason: 'All validation criteria met' };
  }

  /**
   * Adjust segment size iteratively by finding the largest deviation and adjusting accordingly
   * Continues until all rules are met or opposite rules are invalid (must reject)
   */
  private adjustSegmentSize(
    timestamps: string[],
    prices: number[],
    data: Record<string, unknown>,
    validation: { isValid: boolean; reason: string },
    availableTimestamps: string[] // Timestamps disponibles pour l'expansion (par jour uniquement)
  ): {
    timestamps: string[];
    redPoints: Array<any>;
    greenPoints: Array<any>;
  } | null {
    
    let currentTimestamps = [...timestamps];
    let currentPrices = [...prices];
    let attempts = 0;
    const maxAttempts = 50; // Increased to allow more iterations
    
    // Utiliser availableTimestamps pour l'expansion (limités au jour en cours)
    const allTimestamps = availableTimestamps;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Recalculate all metrics for current state with the NEW set of points
      // Step 1: Recalculate prices from the current timestamps (points_data)
      const currentPricesRecalculated = currentTimestamps.map(ts => parseFloat((data[ts] as Record<string, unknown>)['4. close'] as string));
      
      // Step 2: Recalculate all original points (points_data = tous les points du segment)
      const originalPoints = currentTimestamps.map(ts => {
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

      // Step 3: Recalculate filtered points (redPoints and greenPoints) with the new set
      const { redPoints, greenPoints } = this.applyAdvancedFiltering(currentTimestamps, currentPricesRecalculated, data);
      
      // Step 4: Recalculate metrics
      const currentAvg = (Math.min(...currentPricesRecalculated) + Math.max(...currentPricesRecalculated)) / 2;
      const currentTrend = currentPricesRecalculated[currentPricesRecalculated.length - 1] > currentAvg ? 'UP' : 'DOWN';
      
      // Update currentPrices for consistency
      currentPrices = currentPricesRecalculated;

      const pointsInRegion = originalPoints.filter(point => {
        if (currentTrend === 'UP') {
          return point.close > currentAvg;
        } else {
          return point.close < currentAvg;
        }
      }).length;
      
      // Calculate all deviations
      const deviations = {
        redPoints: redPoints.length - 6, // Target: 6, deviation from min
        redPointsMax: redPoints.length - 50, // Target: max 50
        greenPoints: greenPoints.length - 4, // Target: 4, deviation from min
        pointsInRegion: pointsInRegion - 6, // Target: 6, deviation from min
        pointsInRegionMax: pointsInRegion - 50, // Target: max 50
      };
      
      // Find the largest absolute deviation
      const largestDeviation = this.findLargestDeviation(deviations);
      
      // Check if we have opposite invalid rules (must reject)
      if (this.hasOppositeInvalidRules(deviations)) {
        return null;
      }
      
      // If all rules are valid, we're done!
      if (largestDeviation === null) {
        return { timestamps: currentTimestamps, redPoints, greenPoints };
      }
      
      // Calculate adjustment: deviation + 1
      const adjustment = Math.abs(largestDeviation.value) + 1;
      const needsExpansion = largestDeviation.value < 0; // Negative means too few
      const needsReduction = largestDeviation.value > 0; // Positive means too many
      
      
      let newTimestamps: string[];
      let newPrices: number[];
      
      if (needsReduction) {
        // Remove points from the oldest (beginning) or newest (end) based on rule
        newTimestamps = this.removePointsFromTemporalExtremes(
          currentTimestamps, 
          currentPrices, 
          adjustment, 
          largestDeviation.name,
          currentAvg,
          currentTrend
        );
        newPrices = newTimestamps.map(ts => parseFloat((data[ts] as Record<string, unknown>)['4. close'] as string));
      } else {
        // Expand by adding points ONLY at the end (never at the beginning to maintain continuity)
        // Le début du segment ne doit JAMAIS reculer pour garantir que les segments se suivent
        const currentStartIndex = allTimestamps.indexOf(currentTimestamps[0]);
        const currentEndIndex = allTimestamps.indexOf(currentTimestamps[currentTimestamps.length - 1]);
        
        // Ajouter uniquement après la fin (vers l'avant temporellement)
        // Ne JAMAIS ajouter avant le début pour éviter de "reculer"
        const afterEnd = Math.min(allTimestamps.length, currentEndIndex + 1 + adjustment);
        
        // Le début reste identique, on n'ajoute qu'à la fin
        newTimestamps = allTimestamps.slice(currentStartIndex, afterEnd);
        newPrices = newTimestamps.map(ts => parseFloat((data[ts] as Record<string, unknown>)['4. close'] as string));
        
      }
      
      // Ensure we maintain minimum points
      if (newTimestamps.length < 6) {
        break;
      }
      
      // Update for next iteration
      currentTimestamps = newTimestamps;
      currentPrices = newPrices;
    }
    
    return null;
  }

  /**
   * Find the largest deviation across all rules
   */
  private findLargestDeviation(deviations: {
    redPoints: number;
    redPointsMax: number;
    greenPoints: number;
    pointsInRegion: number;
    pointsInRegionMax: number;
  }): { name: string; value: number } | null {
    // Check for invalid rules (negative for min, positive for max)
    const violations = [
      { name: 'redPoints', value: deviations.redPoints, isViolation: deviations.redPoints < 0 },
      { name: 'redPointsMax', value: deviations.redPointsMax, isViolation: deviations.redPointsMax > 0 },
      { name: 'greenPoints', value: deviations.greenPoints, isViolation: deviations.greenPoints < 0 },
      { name: 'pointsInRegion', value: deviations.pointsInRegion, isViolation: deviations.pointsInRegion < 0 },
      { name: 'pointsInRegionMax', value: deviations.pointsInRegionMax, isViolation: deviations.pointsInRegionMax > 0 },
    ];
    
    // Filter only violations
    const violationsOnly = violations.filter(v => v.isViolation);
    
    if (violationsOnly.length === 0) {
      return null; // All rules satisfied
    }
    
    // Find the one with the largest absolute deviation
    let largest = violationsOnly[0];
    for (const v of violationsOnly) {
      if (Math.abs(v.value) > Math.abs(largest.value)) {
        largest = v;
      }
    }
    
    return { name: largest.name, value: largest.value };
  }

  /**
   * Check if we have opposite invalid rules (e.g., too many red points AND too few region points)
   */
  private hasOppositeInvalidRules(deviations: {
    redPoints: number;
    redPointsMax: number;
    greenPoints: number;
    pointsInRegion: number;
    pointsInRegionMax: number;
  }): boolean {
    // Check for opposite violations:
    // - Too many redPointsMax (positive) AND too few redPoints (negative)
    // - Too many pointsInRegionMax (positive) AND too few pointsInRegion (negative)
    
    const hasTooManyRedAndTooFewRed = deviations.redPointsMax > 0 && deviations.redPoints < 0;
    const hasTooManyRegionAndTooFewRegion = deviations.pointsInRegionMax > 0 && deviations.pointsInRegion < 0;
    
    // Also check cross-violations that conflict
    const hasTooManyRedButTooFewRegion = deviations.redPointsMax > 0 && deviations.pointsInRegion < 0;
    const hasTooManyRegionButTooFewRed = deviations.pointsInRegionMax > 0 && deviations.redPoints < 0;
    
    return hasTooManyRedAndTooFewRed || 
           hasTooManyRegionAndTooFewRegion || 
           hasTooManyRedButTooFewRegion || 
           hasTooManyRegionButTooFewRed;
  }

  /**
   * Remove points from temporal extremes
   * CRITIQUE: Pour garantir la continuité entre segments, on retire de la FIN (points les plus récents)
   * au lieu du début. Cela évite de créer des gaps quand les segments sont redimensionnés.
   */
  private removePointsFromTemporalExtremes(
    timestamps: string[],
    prices: number[],
    pointsToRemove: number,
    ruleName: string,
    averagePrice: number,
    trendDirection: 'UP' | 'DOWN'
  ): string[] {
    // Retirer de la FIN pour préserver le début et garantir la continuité temporelle
    // Le début du segment doit rester fixe pour que le prochain segment puisse commencer juste après
    return timestamps.slice(0, timestamps.length - pointsToRemove);
  }

  /**
   * Calculate how many points to remove based on validation error
   */
  private calculatePointsToRemove(
    timestamps: string[], 
    validation: { isValid: boolean; reason: string }
  ): number {
    if (validation.reason.includes('Too many red points')) {
      const match = validation.reason.match(/(\d+) > 50/);
      if (match) {
        const excess = parseInt(match[1]) - 50;
        return Math.min(excess + 1, Math.floor(timestamps.length * 0.3)); // Cap at 30% removal
      }
    }
    
    if (validation.reason.includes('Too many points in region')) {
      const match = validation.reason.match(/(\d+) > 50/);
      if (match) {
        const excess = parseInt(match[1]) - 50;
        // Be more aggressive: remove at least excess points, but preferably more
        // Since removing points doesn't guarantee removing points from region,
        // we need to remove proportionally more
        const totalPoints = timestamps.length;
        const regionRatio = excess / totalPoints; // How many points are in excess region
        // Remove more than excess to account for non-region points being removed
        const aggressiveRemoval = Math.max(excess * 2, Math.ceil(totalPoints * regionRatio * 2));
        return Math.min(aggressiveRemoval, Math.floor(timestamps.length * 0.5)); // Cap at 50% removal
      }
    }
    
    if (validation.reason.includes('Too few red points')) {
      return Math.max(1, Math.floor(timestamps.length * 0.1));
    }
    
    if (validation.reason.includes('Too few green points')) {
      return Math.max(1, Math.floor(timestamps.length * 0.1));
    }
    
    if (validation.reason.includes('Too few points in region')) {
      return Math.max(1, Math.floor(timestamps.length * 0.1));
    }
    
    // Default: remove 20% of points
    return Math.max(1, Math.floor(timestamps.length * 0.2));
  }

  /**
   * Truncate data intelligently to maintain continuity
   */
  private truncateDataIntelligently(
    timestamps: string[],
    prices: number[],
    pointsToRemove: number,
    reason: string,
    averagePrice?: number,
    trendDirection?: 'UP' | 'DOWN'
  ): { newTimestamps: string[]; newPrices: number[] } {
    // If we have too many points in region, try to remove points that are actually in the region
    if (reason.includes('Too many points in region') && averagePrice !== undefined && trendDirection) {
      // Identify which points are in the region
      const pointsInRegionIndices: number[] = [];
      for (let i = 0; i < prices.length; i++) {
        if (trendDirection === 'UP' && prices[i] > averagePrice) {
          pointsInRegionIndices.push(i);
        } else if (trendDirection === 'DOWN' && prices[i] < averagePrice) {
          pointsInRegionIndices.push(i);
        }
      }
      
      // If we have enough region points to remove, prioritize removing them
      if (pointsInRegionIndices.length > pointsToRemove) {
        // Remove from both ends of region points
        const removeFromEnd = Math.floor(pointsToRemove * 0.8);
        const removeFromStart = pointsToRemove - removeFromEnd;
        
        // Get indices to remove (from end and start of region)
        const indicesToRemove = new Set<number>();
        // Remove from end of region
        for (let i = 0; i < removeFromEnd && i < pointsInRegionIndices.length; i++) {
          indicesToRemove.add(pointsInRegionIndices[pointsInRegionIndices.length - 1 - i]);
        }
        // Remove from start of region
        for (let i = 0; i < removeFromStart && i < pointsInRegionIndices.length; i++) {
          indicesToRemove.add(pointsInRegionIndices[i]);
        }
        
        // Create new arrays excluding removed indices
        const newTimestamps = timestamps.filter((_, idx) => !indicesToRemove.has(idx));
        const newPrices = prices.filter((_, idx) => !indicesToRemove.has(idx));
        
        return { newTimestamps, newPrices };
      }
    }
    
    // Fallback: If we have too many points in region, remove from both ends
    if (reason.includes('Too many points in region')) {
      const removeFromEnd = Math.floor(pointsToRemove * 0.8);
      const removeFromStart = pointsToRemove - removeFromEnd;
      
      let newTimestamps = timestamps;
      let newPrices = prices;
      
      if (removeFromEnd > 0) {
        newTimestamps = newTimestamps.slice(0, newTimestamps.length - removeFromEnd);
        newPrices = newPrices.slice(0, newPrices.length - removeFromEnd);
      }
      
      if (removeFromStart > 0) {
        newTimestamps = newTimestamps.slice(removeFromStart);
        newPrices = newPrices.slice(removeFromStart);
      }
      
      return { newTimestamps, newPrices };
    }
    
    // For other cases (too many red points), remove from the beginning
    const newTimestamps = timestamps.slice(pointsToRemove);
    const newPrices = prices.slice(pointsToRemove);
    return { newTimestamps, newPrices };
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
    redPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    greenPointsData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
    redPointCount: number;
    greenPointCount: number;
    blackPointsCount: number;
  }>, stockDataId: string): Promise<number> {
    const { createAnalysisResultImage } = await import('./chartImageGenerator');
    let savedCount = 0;
    
    // Supprimer tous les segments existants pour ce symbole et cette date avant d'insérer les nouveaux
    // Utiliser symbol ET date pour éviter les segments d'anciennes analyses qui auraient un stock_data_id différent
    // Cela garantit qu'on a toujours les segments les plus récents pour un symbole/date donné
    if (segments.length > 0) {
      const symbolToDelete = segments[0].symbol;
      const dateToDelete = segments[0].date;
      
      try {
        const deleteResult = await sql`
          DELETE FROM analysis_results 
          WHERE symbol = ${symbolToDelete} AND date = ${dateToDelete}
          RETURNING id
        `;
        if (deleteResult.length > 0) {
          console.log(`🗑️ ${deleteResult.length} ancien(s) segment(s) supprimé(s) pour ${symbolToDelete} - ${dateToDelete}`);
        }
      } catch (deleteError) {
        console.error(`Erreur lors de la suppression des segments existants pour ${symbolToDelete} - ${dateToDelete}:`, deleteError);
        // Continuer même si la suppression échoue
      }
    }
    
    for (const segment of segments) {
      try {
        // Sauvegarder le segment
        await sql`
          INSERT INTO analysis_results (
            id, stock_data_id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, 
            points_data, original_point_count, points_in_region, schema_type,
            red_points_data, green_points_data, red_point_count, green_point_count, black_points_count
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
            'UNCLASSIFIED',
            ${JSON.stringify(segment.redPointsData)},
            ${JSON.stringify(segment.greenPointsData)},
            ${segment.redPointCount},
            ${segment.greenPointCount},
            ${segment.blackPointsCount}
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
        // Skip the next point as we've already processed it as part of this segment
        i++;
      }
    }
    
    // Create a new array with only the points we want to keep
    return prices.map((_, index) => index).filter(index => indicesToKeep[index]);
  
  }
}


