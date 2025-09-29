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

// Charger les variables d'environnement
config({ path: '.env' });

// Configuration des marchés supportés avec symboles corrects
export const MARKET_CONFIG = {
  CRYPTOCURRENCY: {
    Bitcoin: { symbol: 'BTC', apiFunction: 'DIGITAL_CURRENCY_INTRADAY' }, // INTRADAY comme AAPL
    Ethereum: { symbol: 'ETH', apiFunction: 'DIGITAL_CURRENCY_INTRADAY' }
  },
  COMMODITY: {
    Gold: { symbol: 'GLD', apiFunction: 'TIME_SERIES_INTRADAY' }, // INTRADAY fonctionne
    Oil: { symbol: 'USO', apiFunction: 'TIME_SERIES_INTRADAY' }   // INTRADAY fonctionne
  },
  INDEX: {
    SP500: { symbol: 'SPY', apiFunction: 'TIME_SERIES_INTRADAY' } // INTRADAY fonctionne
  },
  STOCK: {
    Apple: { symbol: 'AAPL', apiFunction: 'TIME_SERIES_INTRADAY' }, // INTRADAY fonctionne
    Microsoft: { symbol: 'MSFT', apiFunction: 'TIME_SERIES_INTRADAY' },
    LVMH: { symbol: 'MC.PA', apiFunction: 'TIME_SERIES_INTRADAY' }, // INTRADAY comme AAPL
    Dassault: { symbol: 'DSY.PA', apiFunction: 'TIME_SERIES_INTRADAY' }, // INTRADAY comme AAPL
    Thales: { symbol: 'HO.PA', apiFunction: 'TIME_SERIES_INTRADAY' }, // INTRADAY comme AAPL
    Danone: { symbol: 'BN.PA', apiFunction: 'TIME_SERIES_INTRADAY' } // INTRADAY comme AAPL
  }
};

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
   * Récupère les données depuis l'API selon le type de marché (avec proxy)
   */
  async fetchMarketData(symbol: string, marketType: MarketType): Promise<Record<string, unknown>> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is required');
    }
    
    const url = this.buildApiUrl(symbol, marketType, apiKey);
    
    // 🔧 UTILISER SEULEMENT LE PROXY QUI FONCTIONNE (codetabs.com)
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
    
    console.log(`🔗 Fetching ${marketType} data for ${symbol} via codetabs proxy...`);
    
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      }
    });
    
    const data = await response.json();

    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data.Note) {
      throw new Error(data.Note);
    }

    if (data.Information) {
      throw new Error(data.Information);
    }

    // Traitement spécifique selon le type de marché
    return this.processMarketData(data, marketType);
  }

  /**
   * Construction d'URL spécifique selon le marché
   */
  private buildApiUrl(symbol: string, marketType: MarketType, apiKey: string): string {
    const baseUrl = 'https://www.alphavantage.co/query';
    
    switch (marketType) {
      case 'CRYPTOCURRENCY':
        return `${baseUrl}?function=DIGITAL_CURRENCY_INTRADAY&symbol=${symbol}&market=USD&interval=1min&outputsize=full&apikey=${apiKey}`;
      case 'COMMODITY':
      case 'INDEX':
      case 'STOCK':
        return `${baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputsize=full&apikey=${apiKey}`;
      default:
        throw new Error(`Unsupported market type: ${marketType}`);
    }
  }

  /**
   * Traitement des données selon le type de marché
   */
  private processMarketData(data: any, marketType: MarketType): Record<string, unknown> {
    switch (marketType) {
      case 'CRYPTOCURRENCY':
        return this.processCryptoData(data);
      case 'COMMODITY':
      case 'INDEX':
      case 'STOCK':
        return this.processStandardData(data, 'INTRADAY');
      default:
        throw new Error(`Unsupported market type: ${marketType}`);
    }
  }

  /**
   * Traitement des données crypto (structure différente)
   */
  private processCryptoData(data: any): Record<string, unknown> {
    const timeSeries = data['Time Series (Digital Currency Intraday)'];
    if (!timeSeries) {
      throw new Error('No crypto intraday time series data found');
    }

    console.log(`📊 Processing crypto intraday data with ${Object.keys(timeSeries).length} timestamps`);

    // Normalisation des données crypto vers le format standard
    const normalizedData: Record<string, unknown> = {};
    
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      normalizedData[timestamp] = {
        '1. open': (values as any)['1a. open (USD)'],
        '2. high': (values as any)['2a. high (USD)'],
        '3. low': (values as any)['3a. low (USD)'],
        '4. close': (values as any)['4a. close (USD)'],
        '5. volume': (values as any)['5. volume']
      };
    }
    
    return normalizedData;
  }



  /**
   * Traitement des données standard (actions, indices)
   */
  private processStandardData(data: any, dataType: 'INTRADAY' | 'DAILY' = 'INTRADAY'): Record<string, unknown> {
    let timeSeries;
    
    if (dataType === 'DAILY') {
      timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No daily time series data found');
      }
    } else {
      timeSeries = data['Time Series (1min)'];
      if (!timeSeries) {
        throw new Error('No intraday time series data found');
      }
    }

    console.log(`📊 Processing ${dataType.toLowerCase()} data with ${Object.keys(timeSeries).length} timestamps`);
    return timeSeries;
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
    
    // ✅ CORRECT : Extraire la date des données API selon le type de marché
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
  }>): Promise<number> {
    let savedCount = 0;
    
    for (const segment of segments) {
      try {
        // Construire le stockDataId à partir du symbol et date du segment
        const stockDataId = `${segment.symbol}_${segment.date}`;
        
        await sql`
          INSERT INTO analysis_results (
            id, stock_data_id, symbol, date, segment_start, segment_end, point_count,
            x0, min_price, max_price, average_price, trend_direction, 
            points_data, original_point_count, points_in_region, schema_type
          ) VALUES (
            ${segment.id}, -- "AAPL_2025-01-23_abc123"
            ${stockDataId}, -- "AAPL_2025-01-23"
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
        savedCount++;
      } catch (error) {
        console.error(`Error saving segment ${segment.id}:`, error);
      }
    }
    
    return savedCount;
  }

  /**
   * Traitement complet d'un actif de marché
   */
  async processMarketAsset(
    symbol: string, 
    marketType: MarketType
  ): Promise<{
    success: boolean;
    message: string;
    segmentsCreated: number;
    stockDataId: string;
    dataDate: string; // Date des données
  }> {
    try {
      console.log(`🔄 Processing ${marketType} asset: ${symbol}`);
      
      // 1. Récupérer les données depuis l'API
      const marketData = await this.fetchMarketData(symbol, marketType);
      
      // 2. Extraire la date des données pour validation
      const dataDate = this.extractDateFromMarketData(marketData, marketType);
      
      // 3. Sauvegarder les données brutes avec market_type et date correcte
      const stockDataId = await this.saveMarketData(symbol, marketType, marketData);
      
      // 4. Extraire et analyser les segments (MÊME LOGIQUE POUR TOUS LES MARCHÉS)
      // Utiliser la méthode originale extractSegments qui fonctionne pour AAPL, GLD, USO, SPY
      const segments = this.extractSegments(symbol, marketData);
      
      // 5. Sauvegarder les résultats AVEC la date des données
      const savedCount = await this.saveAnalysisResults(segments);
      
      console.log(`✅ Successfully processed ${symbol} (${marketType}): ${savedCount} segments created`);
      
      return {
        success: true,
        message: `Successfully processed ${symbol} (${marketType}) with data from ${dataDate}`,
        segmentsCreated: savedCount,
        stockDataId,
        dataDate
      };
    } catch (error: unknown) {
      console.error(`💥 Error processing ${symbol}:`, error);
      return {
        success: false,
        message: `Error processing ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        segmentsCreated: 0,
        stockDataId: '',
        dataDate: ''
      };
    }
  }

  /**
   * Traitement par lot de plusieurs actifs
   */
  async processMultipleAssets(
    assets: Array<{ symbol: string; marketType: MarketType; name: string }>
  ): Promise<Array<{
    symbol: string;
    marketType: MarketType;
    name: string;
    success: boolean;
    segmentsCreated?: number;
    stockDataId?: string;
    dataDate?: string;
    error?: string;
  }>> {
    const results = [];
    
    for (const asset of assets) {
      try {
        console.log(`\n📈 Processing ${asset.name} (${asset.symbol})...`);
        
        const result = await this.processMarketAsset(asset.symbol, asset.marketType);
        
        results.push({
          symbol: asset.symbol,
          marketType: asset.marketType,
          name: asset.name,
          success: result.success,
          segmentsCreated: result.segmentsCreated,
          stockDataId: result.stockDataId,
          dataDate: result.dataDate,
          error: result.success ? undefined : result.message
        });

        // Pause pour respecter les limites de l'API
        console.log('⏳ Pause de 2 secondes...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`💥 Erreur pour ${asset.name}:`, error);
        results.push({
          symbol: asset.symbol,
          marketType: asset.marketType,
          name: asset.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

}
