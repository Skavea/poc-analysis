/**
 * API Route: Process Stock
 * ========================
 * 
 * Endpoint to add a new stock and run analysis
 * Gère les streams multiples avec vérification des plages de dates
 */

import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisService } from '@/lib/stockAnalysisService';
import { MultiMarketAnalysisService } from '@/lib/multiMarketAnalysisService';
import { StreamDateRangeService } from '@/lib/streamDateRangeService';
import { MarketType } from '@/lib/schema';

/**
 * Détermine le type de marché selon le symbole
 */
function getMarketType(symbol: string): MarketType {
  if (symbol.endsWith('.PA')) {
    return 'STOCK'; // Actions françaises
  } else if (symbol === 'BTC' || symbol === 'ETH') {
    return 'CRYPTOCURRENCY';
  } else if (symbol === 'GLD' || symbol === 'USO') {
    return 'COMMODITY';
  } else if (symbol === 'SPY') {
    return 'INDEX';
  } else {
    return 'STOCK'; // Par défaut, actions américaines
  }
}

/**
 * Extrait les plages de dates des données récupérées de l'API
 */
function extractDateRangeFromApiData(data: Record<string, unknown>): { startDate: Date; endDate: Date } | null {
  const timestamps = Object.keys(data).filter(key => 
    key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  );
  
  if (timestamps.length === 0) return null;
  
  const sorted = timestamps.sort();
  const startDate = new Date(sorted[0]);
  const endDate = new Date(sorted[sorted.length - 1]);
  
  return { startDate, endDate };
}

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Le symbole est requis' },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    const marketType = getMarketType(upperSymbol);

    // Connexion à la base de données
    const { neon } = await import('@neondatabase/serverless');
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const sql = neon(databaseUrl);

    // Vérifier si des streams existent déjà pour ce marché
    const existingStreams = await sql`
      SELECT id, symbol, market_type, date, data
      FROM stock_data 
      WHERE symbol = ${upperSymbol}
      ORDER BY created_at DESC
    `;

    console.log(`📊 Streams existants pour ${upperSymbol}: ${existingStreams.length}`);

    // Variable pour stocker les données API (utilisée dans et hors du bloc if)
    let apiData: Record<string, unknown> | undefined;

    // Si des streams existent, vérifier les plages de dates
    if (existingStreams.length > 0) {
      const dateRangeService = new StreamDateRangeService(databaseUrl);
      
      try {
        if (marketType === 'STOCK' && upperSymbol.endsWith('.PA')) {
          const multiService = new MultiMarketAnalysisService();
          apiData = await multiService.fetchMarketData(upperSymbol, marketType);
        } else if (marketType === 'CRYPTOCURRENCY') {
          const multiService = new MultiMarketAnalysisService();
          apiData = await multiService.fetchMarketData(upperSymbol, marketType);
        } else {
          const service = StockAnalysisService.getInstance();
          apiData = await service.fetchStockData(upperSymbol);
        }
      } catch (apiError) {
        console.error('Erreur lors de la récupération des données API:', apiError);
        return NextResponse.json({
          success: false,
          message: `Erreur lors de la récupération des données pour ${upperSymbol}: ${apiError instanceof Error ? apiError.message : 'Erreur inconnue'}`,
          segmentsCreated: 0
        });
      }

      // Vérifier que les données ont bien été récupérées
      if (!apiData) {
        return NextResponse.json({
          success: false,
          message: `Erreur : données API non récupérées pour ${upperSymbol}`,
          segmentsCreated: 0
        });
      }

      // Extraire la plage de dates des nouvelles données
      const newDataRange = extractDateRangeFromApiData(apiData);
      
      if (!newDataRange) {
        return NextResponse.json({
          success: false,
          message: `Impossible d'extraire les dates des données récupérées pour ${upperSymbol}`,
          segmentsCreated: 0
        });
      }

      console.log(`📅 Nouvelle plage de données: ${newDataRange.startDate.toISOString()} -> ${newDataRange.endDate.toISOString()}`);

      // Vérifier si cette plage chevauche des streams existants
      const validation = await dateRangeService.validateDateRange(upperSymbol, newDataRange);

      if (!validation.valid) {
        // Chercher une plage alternative disponible
        const availableRange = await dateRangeService.findAvailableDateRange(upperSymbol, marketType);

        if (!availableRange) {
          // Aucune plage disponible
          const message = await dateRangeService.getAvailabilityMessage(upperSymbol, marketType);
          
          return NextResponse.json({
            success: false,
            message: message,
            segmentsCreated: 0,
            needsDateRange: true
          });
        } else {
          // Une plage est disponible : tronquer les données API pour correspondre à cette plage
          console.log(`🔄 Troncature des données pour correspondre à la plage disponible`);
          console.log(`   - Plage originale : ${newDataRange.startDate.toISOString()} → ${newDataRange.endDate.toISOString()}`);
          console.log(`   - Plage cible : ${availableRange.startDate.toISOString()} → ${availableRange.endDate.toISOString()}`);
          
          // Filtrer les données pour ne garder que les timestamps dans la plage disponible
          const truncatedData: Record<string, unknown> = {};
          let truncatedCount = 0;
          
          // Normaliser les dates pour la comparaison (ignorer les heures)
          const rangeStartDay = new Date(availableRange.startDate);
          rangeStartDay.setHours(0, 0, 0, 0);
          
          const rangeEndDay = new Date(availableRange.endDate);
          rangeEndDay.setHours(23, 59, 59, 999);
          
          console.log(`   - Comparaison inclusive : ${rangeStartDay.toISOString()} → ${rangeEndDay.toISOString()}`);
          
          for (const [timestamp, value] of Object.entries(apiData)) {
            const tsDate = new Date(timestamp);
            const tsDay = new Date(tsDate);
            tsDay.setHours(0, 0, 0, 0);
            
            // Comparer les jours (sans les heures)
            if (tsDay >= rangeStartDay && tsDay <= rangeEndDay) {
              truncatedData[timestamp] = value;
              truncatedCount++;
            }
          }
          
          console.log(`   - Points originaux : ${Object.keys(apiData).length}`);
          console.log(`   - Points après troncature : ${truncatedCount}`);
          
          // Afficher la plage réelle des données tronquées
          if (truncatedCount > 0) {
            const truncatedTimestamps = Object.keys(truncatedData).sort();
            const firstTs = new Date(truncatedTimestamps[0]);
            const lastTs = new Date(truncatedTimestamps[truncatedTimestamps.length - 1]);
            console.log(`   - Plage réelle des données tronquées : ${firstTs.toISOString()} → ${lastTs.toISOString()}`);
          }
          
          if (truncatedCount === 0) {
            // Aucune donnée dans la plage disponible
            const message = 
              `⚠️ Les données API ne contiennent aucun point dans la plage disponible.\n\n` +
              `📅 Plage disponible : Du ${availableRange.startDate.toLocaleDateString('fr-FR')} au ${availableRange.endDate.toLocaleDateString('fr-FR')}\n` +
              `📊 Plage des données API : Du ${newDataRange.startDate.toLocaleDateString('fr-FR')} au ${newDataRange.endDate.toLocaleDateString('fr-FR')}\n\n` +
              `⚠️ Note : Réessayez plus tard lorsque de nouvelles données seront disponibles dans cette plage.`;
            
            return NextResponse.json({
              success: false,
              message: message,
              segmentsCreated: 0,
              needsDateRange: true
            });
          }
          
          // Remplacer les données API par les données tronquées
          apiData = truncatedData;
          console.log(`✅ Données tronquées avec succès - Création du stream...`);
          
          // Continuer avec les données tronquées (le flux continuera après ce bloc)
        }
      } else {
        console.log(`✅ Validation OK - Aucun chevauchement détecté`);
      }
    }

    // Aucun chevauchement ou premier stream ou données tronquées : procéder à la création
    let result;
    
    // Si on a des données tronquées (apiData existe et a été filtré), on les utilise
    if (existingStreams.length > 0 && apiData !== undefined) {
      console.log(`🔧 Traitement avec données ${Object.keys(apiData).length > 0 ? 'tronquées' : 'complètes'}: ${upperSymbol}`);
      
      // Utiliser les services avec les données déjà récupérées (potentiellement tronquées)
      if (upperSymbol.endsWith('.PA')) {
        const multiService = new MultiMarketAnalysisService();
        // Sauvegarder directement les données tronquées et analyser
        const stockDataId = await multiService.saveMarketData(upperSymbol, 'STOCK', apiData);
        const segments = multiService.extractSegments(upperSymbol, apiData);
        const savedCount = await multiService.saveAnalysisResults(segments, stockDataId);
        
        result = {
          success: true,
          message: `✅ Stream créé avec données tronquées pour ${upperSymbol} (${Object.keys(apiData).length} points)`,
          segmentsCreated: savedCount
        };
      } else if (upperSymbol === 'BTC' || upperSymbol === 'ETH') {
        const multiService = new MultiMarketAnalysisService();
        const stockDataId = await multiService.saveMarketData(upperSymbol, 'CRYPTOCURRENCY', apiData);
        const segments = multiService.extractSegments(upperSymbol, apiData);
        const savedCount = await multiService.saveAnalysisResults(segments, stockDataId);
        
        result = {
          success: true,
          message: `✅ Stream créé avec données tronquées pour ${upperSymbol} (${Object.keys(apiData).length} points)`,
          segmentsCreated: savedCount
        };
      } else {
        const service = StockAnalysisService.getInstance();
        const stockDataId = await service.saveStockData(upperSymbol, apiData);
        const segments = service.extractSegments(upperSymbol, apiData);
        const savedCount = await service.saveAnalysisResults(segments, stockDataId);
        
        result = {
          success: true,
          message: `✅ Stream créé avec données tronquées pour ${upperSymbol} (${Object.keys(apiData).length} points)`,
          segmentsCreated: savedCount
        };
      }
    } else {
      // Flux normal : récupérer les données fraîches et créer le stream
      if (upperSymbol.endsWith('.PA')) {
        // Actions françaises : utiliser MultiMarketAnalysisService
        console.log(`🇫🇷 Traitement d'une action française: ${upperSymbol}`);
        const multiService = new MultiMarketAnalysisService();
        const multiResult = await multiService.processMarketAsset(upperSymbol, 'STOCK');
        result = {
          success: multiResult.success,
          message: multiResult.message,
          segmentsCreated: multiResult.segmentsCreated
        };
      } else if (upperSymbol === 'BTC' || upperSymbol === 'ETH') {
        // Cryptomonnaies : utiliser MultiMarketAnalysisService
        console.log(`₿ Traitement d'une cryptomonnaie: ${upperSymbol}`);
        const multiService = new MultiMarketAnalysisService();
        const multiResult = await multiService.processMarketAsset(upperSymbol, 'CRYPTOCURRENCY');
        result = {
          success: multiResult.success,
          message: multiResult.message,
          segmentsCreated: multiResult.segmentsCreated
        };
      } else {
        // Actions américaines : utiliser StockAnalysisService
        console.log(`🇺🇸 Traitement d'une action américaine: ${upperSymbol}`);
        const service = StockAnalysisService.getInstance();
        result = await service.processStock(upperSymbol);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing stock:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
