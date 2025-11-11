/**
 * Service de gestion des plages de dates pour les streams
 * ======================================================
 * 
 * Ce service gère la logique de vérification et de calcul des plages de dates
 * pour les streams multiples d'un même marché, en évitant les chevauchements
 * et en respectant les limites maximales de jours par type de marché.
 */

import { neon } from '@neondatabase/serverless';
import { MarketType } from './schema';

// Configuration des limites maximales par type de marché (en jours)
const MAX_DAYS_CONFIG: Record<MarketType, number> = {
  STOCK: 2,           // Actions américaines : ~2 jours de données intraday
  CRYPTOCURRENCY: 7,  // Crypto : jusqu'à 7 jours
  COMMODITY: 2,       // Matières premières : ~2 jours
  INDEX: 2           // Indices : ~2 jours
};

// Configuration spécifique pour les actions françaises
const FRENCH_STOCK_MAX_DAYS = 15;

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface StreamDateInfo {
  id: string;
  symbol: string;
  marketType: string;
  dateRange: DateRange;
  totalPoints: number;
}

interface StreamRow {
  id: string;
  symbol: string;
  market_type: MarketType;
  data: unknown;
  total_points: number;
}

interface AvailableDateRange {
  startDate: Date;
  endDate: Date;
  maxDays: number;
  suggestedDays: number;
}

/**
 * Vérifie si un objet correspond au schéma attendu d'une ligne issue de la table stock_data
 */
const isStreamRow = (row: unknown): row is StreamRow => {
  if (!row || typeof row !== 'object') {
    return false;
  }

  const candidate = row as Partial<StreamRow>;
  return typeof candidate.id === 'string'
    && typeof candidate.symbol === 'string'
    && typeof candidate.market_type === 'string'
    && 'data' in candidate
    && 'total_points' in candidate;
};

/**
 * Normalise la structure renvoyée par Neon afin de disposer systématiquement d'un tableau de lignes
 */
const normalizeSqlResult = (result: unknown): StreamRow[] => {
  const possibleRows = Array.isArray(result)
    ? result
    : (result && typeof result === 'object' && 'rows' in result
      ? (result as { rows?: unknown }).rows
      : undefined);

  if (!Array.isArray(possibleRows)) {
    return [];
  }

  return possibleRows.filter(isStreamRow) as StreamRow[];
};

/**
 * Classe de service pour gérer les plages de dates des streams
 */
export class StreamDateRangeService {
  private sql: ReturnType<typeof neon>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  /**
   * Extrait les plages de dates depuis les données d'un stream
   */
  private extractDateRangeFromData(data: Record<string, unknown>): DateRange | null {
    if (!data || typeof data !== 'object') return null;
    
    const timestamps = Object.keys(data).filter(key => 
      key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    );
    
    if (timestamps.length === 0) return null;
    
    const sorted = timestamps.sort();
    const startDate = new Date(sorted[0]);
    const endDate = new Date(sorted[sorted.length - 1]);
    
    return { startDate, endDate };
  }

  /**
   * Récupère toutes les plages de dates existantes pour un symbole
   */
  async getExistingDateRanges(symbol: string): Promise<StreamDateInfo[]> {
    const queryResult = await this.sql`
      SELECT id, symbol, market_type, data, total_points
      FROM stock_data 
      WHERE symbol = ${symbol.toUpperCase()}
      ORDER BY created_at DESC
    `;

    // Les résultats peuvent être fournis sous forme de tableau brut ou via .rows suivant la configuration SQL
    const streams = normalizeSqlResult(queryResult);

    const streamInfos: StreamDateInfo[] = [];

    for (const stream of streams) {
      const dateRange = this.extractDateRangeFromData(stream.data as Record<string, unknown>);
      
      if (dateRange) {
        streamInfos.push({
          id: stream.id,
          symbol: stream.symbol,
          marketType: stream.market_type,
          dateRange,
          totalPoints: stream.total_points
        });
      }
    }

    return streamInfos;
  }

  /**
   * Détermine le nombre maximum de jours autorisés selon le type de marché et le symbole
   */
  private getMaxDaysForMarket(symbol: string, marketType: MarketType): number {
    // Actions françaises ont une limite spéciale
    // Vérifie le suffixe .PA ou les symboles français connus
    const frenchStocks = ['MC', 'HO', 'DSY', 'BN', 'AI', 'OR', 'SU', 'CA', 'GLE', 'SAN'];
    const symbolBase = symbol.replace('.PA', '').toUpperCase();
    
    if (marketType === 'STOCK' && (symbol.endsWith('.PA') || frenchStocks.includes(symbolBase))) {
      return FRENCH_STOCK_MAX_DAYS;
    }
    
    return MAX_DAYS_CONFIG[marketType] || 2;
  }

  /**
   * Vérifie si deux plages de dates se chevauchent
   */
  private doRangesOverlap(range1: DateRange, range2: DateRange): boolean {
    return range1.startDate <= range2.endDate && range2.startDate <= range1.endDate;
  }

  /**
   * Calcule les jours de différence entre deux dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Trouve la meilleure plage de dates disponible pour un nouveau stream
   * 
   * Logique :
   * 1. Récupère toutes les plages existantes
   * 2. Cherche les intervalles libres avant la date actuelle
   * 3. Privilégie les intervalles les plus récents et proches de la date actuelle
   * 4. Respecte les limites max de jours selon le type de marché
   */
  async findAvailableDateRange(
    symbol: string,
    marketType: MarketType
  ): Promise<AvailableDateRange | null> {
    const existingRanges = await this.getExistingDateRanges(symbol);
    const maxDays = this.getMaxDaysForMarket(symbol, marketType);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin de la journée actuelle

    console.log(`📊 Recherche d'une plage disponible pour ${symbol}`);
    console.log(`   - Nombre de streams existants: ${existingRanges.length}`);
    console.log(`   - Nombre max de jours autorisés: ${maxDays}`);

    // Si aucun stream existant, proposer la plage la plus récente
    if (existingRanges.length === 0) {
      const endDate = new Date(today);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - maxDays);
      
      return {
        startDate,
        endDate,
        maxDays,
        suggestedDays: maxDays
      };
    }

    // Trier les plages par date de fin (plus récent en premier)
    const sortedRanges = existingRanges
      .map(info => info.dateRange)
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

    // 1. Vérifier s'il y a de l'espace entre la plage la plus récente et aujourd'hui
    const mostRecentRange = sortedRanges[0];
    const daysSinceMostRecent = this.getDaysDifference(mostRecentRange.endDate, today);

    console.log(`   - Plage la plus récente: ${mostRecentRange.startDate.toISOString()} -> ${mostRecentRange.endDate.toISOString()}`);
    console.log(`   - Jours depuis la plage la plus récente: ${daysSinceMostRecent}`);

    if (daysSinceMostRecent >= 1) {
      // Il y a de l'espace entre la plage la plus récente et aujourd'hui
      // IMPORTANT : On commence JUSTE APRÈS le stream existant, pas à la fin de la plage disponible
      const startDate = new Date(mostRecentRange.endDate);
      startDate.setDate(startDate.getDate() + 1); // Jour suivant après la dernière plage
      
      const availableDays = this.getDaysDifference(startDate, today);
      const suggestedDays = Math.min(availableDays, maxDays);
      
      // Calculer la date de fin en partant du début + nombre de jours suggérés
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + suggestedDays - 1);
      endDate.setHours(23, 59, 59, 999); // Fin de journée

      console.log(`   ✅ Plage trouvée après la plus récente: ${startDate.toISOString()} -> ${endDate.toISOString()} (${suggestedDays} jours)`);
      
      return {
        startDate,
        endDate,
        maxDays,
        suggestedDays
      };
    }

    // 2. Chercher des intervalles libres entre les plages existantes
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const currentRange = sortedRanges[i];
      const nextRange = sortedRanges[i + 1];
      
      // Calculer l'espace entre deux plages
      const gapStart = new Date(nextRange.endDate);
      gapStart.setDate(gapStart.getDate() + 1);
      
      const gapEnd = new Date(currentRange.startDate);
      gapEnd.setDate(gapEnd.getDate() - 1);
      
      const gapDays = this.getDaysDifference(gapStart, gapEnd);
      
      console.log(`   - Intervalle entre plages ${i} et ${i+1}: ${gapDays} jours`);
      
      // S'il y a assez d'espace pour au moins 1 jour
      if (gapDays >= 1) {
        const suggestedDays = Math.min(gapDays, maxDays);
        
        // Ajuster pour prendre le maximum possible dans l'intervalle
        const startDate = new Date(gapEnd);
        startDate.setDate(startDate.getDate() - suggestedDays + 1);
        
        console.log(`   ✅ Plage trouvée entre les streams: ${startDate.toISOString()} -> ${gapEnd.toISOString()} (${suggestedDays} jours)`);
        
        return {
          startDate,
          endDate: gapEnd,
          maxDays,
          suggestedDays
        };
      }
    }

    // 3. Chercher de l'espace avant la plage la plus ancienne
    const oldestRange = sortedRanges[sortedRanges.length - 1];
    const beforeOldestDate = new Date(oldestRange.startDate);
    beforeOldestDate.setDate(beforeOldestDate.getDate() - 1);
    
    // Limiter à un historique raisonnable (par exemple 365 jours)
    const minHistoricalDate = new Date(today);
    minHistoricalDate.setDate(minHistoricalDate.getDate() - 365);
    
    if (beforeOldestDate >= minHistoricalDate) {
      const endDate = beforeOldestDate;
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - maxDays + 1);
      
      // S'assurer qu'on ne va pas trop loin dans le passé
      if (startDate >= minHistoricalDate) {
        console.log(`   ✅ Plage trouvée avant la plus ancienne: ${startDate.toISOString()} -> ${endDate.toISOString()} (${maxDays} jours)`);
        
        return {
          startDate,
          endDate,
          maxDays,
          suggestedDays: maxDays
        };
      }
    }

    console.log(`   ❌ Aucune plage disponible trouvée`);
    return null;
  }

  /**
   * Valide qu'une plage proposée ne chevauche pas les plages existantes
   */
  async validateDateRange(
    symbol: string,
    proposedRange: DateRange
  ): Promise<{ valid: boolean; reason?: string }> {
    const existingRanges = await this.getExistingDateRanges(symbol);

    for (const streamInfo of existingRanges) {
      if (this.doRangesOverlap(proposedRange, streamInfo.dateRange)) {
        return {
          valid: false,
          reason: `La plage proposée chevauche le stream existant "${streamInfo.id}" (${streamInfo.dateRange.startDate.toISOString()} -> ${streamInfo.dateRange.endDate.toISOString()})`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Génère un message utilisateur décrivant la situation
   */
  async getAvailabilityMessage(
    symbol: string,
    marketType: MarketType
  ): Promise<string> {
    const availableRange = await this.findAvailableDateRange(symbol, marketType);

    if (!availableRange) {
      const existingRanges = await this.getExistingDateRanges(symbol);
      const maxDays = this.getMaxDaysForMarket(symbol, marketType);
      
      return `❌ Impossible de créer un nouveau stream pour ${symbol}.\n\n` +
        `Il y a déjà ${existingRanges.length} stream(s) qui couvrent toutes les plages disponibles.\n` +
        `Limite maximale : ${maxDays} jours par stream.\n\n` +
        `Les plages existantes sont :\n` +
        existingRanges
          .map((info, i) => 
            `${i + 1}. ${info.dateRange.startDate.toLocaleDateString('fr-FR')} → ${info.dateRange.endDate.toLocaleDateString('fr-FR')} (${info.totalPoints} points)`
          )
          .join('\n');
    }

    const { startDate, endDate, suggestedDays } = availableRange;
    
    return `✅ Une plage disponible a été trouvée pour ${symbol} :\n\n` +
      `📅 Du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}\n` +
      `📊 Durée : ${suggestedDays} jour(s)\n\n` +
      `Le nouveau stream sera créé avec ces dates.`;
  }
}

