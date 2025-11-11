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

type DeviationRule = {
  name: 'redMin' | 'redMax' | 'greenMin' | 'greenMax' | 'regionMin' | 'regionMax';
  value: number;
  type: 'min' | 'max';
  active: boolean;
};

/**
 * Structure normalisée d'un segment calculé prêt à être enregistré en base.
 * Garder ce type synchronisé avec `analysis_results`.
 */
type AnalyzedSegment = {
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
  u: number;
  redPointsFormatted: string;
  greenPointsFormatted: string;
};

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
  private readonly MIN_RED_POINTS = 6;
  private readonly MAX_RED_POINTS = 30;
  private readonly MIN_GREEN_POINTS = 6;
  private readonly MAX_GREEN_POINTS = 25;
  private readonly MIN_REGION_POINTS = 6;
  private readonly MAX_REGION_POINTS = 20;
  private readonly INITIAL_SEGMENT_SIZE = 22;

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
  extractSegments(symbol: string, data: Record<string, unknown>): AnalyzedSegment[] {
    const segments: AnalyzedSegment[] = [];
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
  ): AnalyzedSegment[] {
    const segments: AnalyzedSegment[] = [];
    const segmentDuration = this.INITIAL_SEGMENT_SIZE; // Fenêtre initiale de 16 minutes (1 point = 1 minute)
    const maxSegmentsPerDay = Number.MAX_SAFE_INTEGER; // Permet de couvrir toute la journée sans coupure artificielle

    // Sort timestamps
    timestamps.sort();

    // Extract continuous segments with 1-minute steps
    const stepSize = 1; // 1 minute step for continuous segments
    

    let currentIndex = 0;
    
    // Boucle principale : continuer tant qu'on peut créer des segments
    while (currentIndex < timestamps.length && segments.length < maxSegmentsPerDay) {
      // Vérifier qu'il reste assez de points pour un segment minimum
      if (currentIndex + segmentDuration > timestamps.length) {
        break; // Pas assez de points restants
      }
      
      // Prendre une plage initiale de segmentDuration minutes
      const segmentTimestamps = timestamps.slice(currentIndex, currentIndex + segmentDuration);
      
      if (segmentTimestamps.length < segmentDuration) {
        // Pas assez de points pour la fenêtre initiale, fin de traitement pour la journée
        break;
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
        if (effectiveStartTimestamps.length < segmentDuration) {
          // Pas assez de points après ajustement pour respecter la fenêtre initiale
          endTimestamp = timestamps[timestamps.length - 1];
          currentIndex = timestamps.length; // Forcer la fin de la boucle
          console.log(`[DEBUG] Plus assez de points après ajustement (${effectiveStartTimestamps.length} points)`);
          break;
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
      if (endTimestampIndex >= timestamps.length - 1 || timestamps.length - endTimestampIndex - 1 < segmentDuration) {
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
  ): AnalyzedSegment | null {
    if (timestamps.length < this.MIN_RED_POINTS) return null;

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
      const deviationRules = this.buildDeviationRules(
        finalRedPoints.length,
        finalGreenPoints.length,
        finalPointsInRegion
      );
      
      if (this.hasOppositeInvalidRules(deviationRules)) {
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

    // Calculate black points count (variations strictes + 2)
    const blackPointsCount = this.calculateBlackPointsCount(finalPrices);
    
    // Calculate u parameter: (maxPrice - minPrice) / blackPointsCount
    // u représente l'intervalle moyen par point noir
    // Tronquer à 2 décimales sans arrondir (garder seulement 2 chiffres après la virgule)
    const uRaw = blackPointsCount > 0 ? (finalMaxPrice - finalMinPrice) / blackPointsCount : 0;
    const u = Math.floor(uRaw * 100) / 100; // Tronquer à 2 décimales (pas d'arrondi)
    
    // Ajuster les valeurs nulles selon la direction pour éviter les zéros stricts dans les tableaux
    const normalizeZeroValue = (value: number): number => {
      if (Math.abs(value) < 1e-9) {
        return finalTrendDirection === 'UP' ? 0.000001 : -0.000001;
      }
      return value;
    };
    
    // Calculate formatted red points: (close - averagePrice) pour chaque point rouge, en ordre chronologique
    // Format: "price1 price2 price3 ..." (prix en float, séparés par des espaces)
    const redPointsFormatted = finalRedPoints
      .map(point => point.close - finalAveragePrice)
      .map(normalizeZeroValue)
      .map(value => value.toFixed(6))
      .join(' ');
    
    // Calculate formatted green points: (close - averagePrice) pour chaque point vert, en ordre chronologique
    // Format: "price1 price2 price3 ..." (prix en float, séparés par des espaces)
    const greenPointsFormatted = finalGreenPoints
      .map(point => point.close - finalAveragePrice)
      .map(normalizeZeroValue)
      .map(value => value.toFixed(6))
      .join(' ');
    
    // Debug: Log pour vérifier le calcul (à retirer après validation)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Black Points Debug] Segment ${segmentId}:`, {
        prices: finalPrices.slice(0, 10).map(p => p.toFixed(2)), // Premiers 10 prix
        totalPrices: finalPrices.length,
        blackPointsCount,
        u: u.toFixed(4),
        priceRange: (finalMaxPrice - finalMinPrice).toFixed(2)
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
      blackPointsCount,
      u,
      redPointsFormatted,
      greenPointsFormatted
    };
  }

  /**
   * Calcule le nombre de points noirs (variations strictes + 2)
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
    
    // Check red points count (limits configurés)
    if (redCount < this.MIN_RED_POINTS) {
      return { isValid: false, reason: `Too few red points: ${redCount} < ${this.MIN_RED_POINTS}` };
    }
    if (redCount > this.MAX_RED_POINTS) {
      return { isValid: false, reason: `Too many red points: ${redCount} > ${this.MAX_RED_POINTS}` };
    }
    
    // Check green points count (limits configurés)
    if (greenCount < this.MIN_GREEN_POINTS) {
      return { isValid: false, reason: `Too few green points: ${greenCount} < ${this.MIN_GREEN_POINTS}` };
    }
    if (greenCount > this.MAX_GREEN_POINTS) {
      return { isValid: false, reason: `Too many green points: ${greenCount} > ${this.MAX_GREEN_POINTS}` };
    }
    
    // Check points in region (seuil minimum) - use original points if available
    const pointsToCheck = originalPoints || redPoints;
    const pointsInRegion = pointsToCheck.filter(point => {
      if (trendDirection === 'UP') {
        return point.close > averagePrice;
      } else {
        return point.close < averagePrice;
      }
    }).length;
    
    
    if (pointsInRegion < this.MIN_REGION_POINTS) {
      return { isValid: false, reason: `Too few points in region: ${pointsInRegion} < ${this.MIN_REGION_POINTS}` };
    }
    if (pointsInRegion > this.MAX_REGION_POINTS) {
      return { isValid: false, reason: `Too many points in region: ${pointsInRegion} > ${this.MAX_REGION_POINTS}` };
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
      const deviationRules = this.buildDeviationRules(redPoints.length, greenPoints.length, pointsInRegion);
      
      // Find the largest absolute deviation
      const largestDeviation = this.findLargestDeviation(deviationRules);
      
      // Check if we have opposite invalid rules (must reject)
      if (this.hasOppositeInvalidRules(deviationRules)) {
        return null;
      }
      
      // If all rules are valid, we're done!
      if (largestDeviation === null) {
        return { timestamps: currentTimestamps, redPoints, greenPoints };
      }
      
      // Calculate adjustment: exact écart au seuil
      const adjustment = Math.abs(largestDeviation.value);
      if (adjustment === 0) {
        continue;
      }
      const needsExpansion = largestDeviation.type === 'min'; // Règle minimale non respectée
      const needsReduction = largestDeviation.type === 'max'; // Règle maximale dépassée
      
      
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
      if (newTimestamps.length < this.MIN_RED_POINTS) {
        break;
      }
      
      // Update for next iteration
      currentTimestamps = newTimestamps;
      currentPrices = newPrices;
    }
    
    return null;
  }

  /**
   * Build deviation rules (écarts aux contraintes) pour un segment donné
   */
  private buildDeviationRules(
    redPointsCount: number,
    greenPointsCount: number,
    pointsInRegion: number
  ): DeviationRule[] {
    return [
      {
        name: 'redMin',
        value: redPointsCount - this.MIN_RED_POINTS,
        type: 'min',
        active: true
      },
      {
        name: 'redMax',
        value: redPointsCount - this.MAX_RED_POINTS,
        type: 'max',
        active: true
      },
      {
        name: 'greenMin',
        value: greenPointsCount - this.MIN_GREEN_POINTS,
        type: 'min',
        active: true
      },
      {
        name: 'greenMax',
        value: greenPointsCount - this.MAX_GREEN_POINTS,
        type: 'max',
        active: true
      },
      {
        name: 'regionMin',
        value: pointsInRegion - this.MIN_REGION_POINTS,
        type: 'min',
        active: true
      },
      {
        name: 'regionMax',
        value: pointsInRegion - this.MAX_REGION_POINTS,
        type: 'max',
        active: true
      }
    ];
  }
  
  /**
   * Find the largest deviation across all rules
   */
  private findLargestDeviation(rules: DeviationRule[]): DeviationRule | null {
    const violations = rules.filter(rule => rule.active && (
      (rule.type === 'min' && rule.value < 0) ||
      (rule.type === 'max' && rule.value > 0)
    ));
    
    if (violations.length === 0) {
      return null;
    }
    
    return violations.reduce((largest, current) => {
      return Math.abs(current.value) > Math.abs(largest.value) ? current : largest;
    }, violations[0]);
  }
  
  /**
   * Check if we have opposite invalid rules (min et max en conflit sur le même jeu de points)
   */
  private hasOppositeInvalidRules(rules: DeviationRule[]): boolean {
    const minViolations = rules.filter(rule => rule.active && rule.type === 'min' && rule.value < 0);
    const maxViolations = rules.filter(rule => rule.active && rule.type === 'max' && rule.value > 0);
    
    return minViolations.length > 0 && maxViolations.length > 0;
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
   * Save analysis results to database
   */
  async saveAnalysisResults(segments: AnalyzedSegment[], stockDataId: string): Promise<number> {
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
            red_points_data, green_points_data, red_point_count, green_point_count, black_points_count, u,
            red_points_formatted, green_points_formatted
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
            ${segment.blackPointsCount},
            ${segment.u},
            ${segment.redPointsFormatted},
            ${segment.greenPointsFormatted}
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


