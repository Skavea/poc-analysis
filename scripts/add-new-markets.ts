#!/usr/bin/env npx tsx
/**
 * Ajout des Nouveaux Marchés
 * ==========================
 * 
 * Ajoute seulement les nouveaux marchés sans toucher aux données existantes
 * Parfait pour ajouter progressivement de nouveaux actifs
 */

import { MultiMarketAnalysisService } from '../src/lib/multiMarketAnalysisService';
import { neon } from '@neondatabase/serverless';
import { MarketType } from '../src/lib/schema';
import { config } from 'dotenv';

// Charger les variables d'environnement depuis .env
config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(databaseUrl);

// Configuration des nouveaux marchés à ajouter (sans AAPL qui existe déjà)
const NEW_MARKETS = [
  { symbol: 'BTC', marketType: 'CRYPTOCURRENCY' as MarketType, name: 'Bitcoin' },
  { symbol: 'GLD', marketType: 'COMMODITY' as MarketType, name: 'Or (ETF)' },
  { symbol: 'USO', marketType: 'COMMODITY' as MarketType, name: 'Pétrole (ETF)' },
  { symbol: 'SPY', marketType: 'INDEX' as MarketType, name: 'S&P 500' },
  { symbol: 'MC.PA', marketType: 'STOCK' as MarketType, name: 'LVMH' },
  { symbol: 'DSY.PA', marketType: 'STOCK' as MarketType, name: 'Dassault' },
  { symbol: 'HO.PA', marketType: 'STOCK' as MarketType, name: 'Thales' },
  { symbol: 'BN.PA', marketType: 'STOCK' as MarketType, name: 'Danone' }
];

async function addNewMarkets() {
  console.log('🚀 Ajout des nouveaux marchés sur Neon...');
  console.log('=========================================');
  
  const startTime = Date.now();
  const service = new MultiMarketAnalysisService();
  
  // Vérifier la connexion à Neon
  try {
    await sql`SELECT 1`;
    console.log('✅ Connexion à Neon établie');
  } catch (error) {
    console.error('❌ Erreur de connexion à Neon:', error);
    return;
  }

  // Vérifier la clé API
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    console.error('❌ ALPHA_VANTAGE_API_KEY environment variable is not set');
    return;
  }
  console.log('✅ Clé API Alpha Vantage configurée');

  const results = [];

  for (const market of NEW_MARKETS) {
    try {
      console.log(`\n📈 Traitement de ${market.name} (${market.symbol}) [${market.marketType}]...`);
      
      // Vérifier si les données existent déjà
      const existingData = await sql`
        SELECT id, date, created_at, total_points FROM stock_data 
        WHERE symbol = ${market.symbol} AND market_type = ${market.marketType}
      `;

      if (existingData.length > 0) {
        console.log(`⚠️  Données existantes trouvées pour ${market.symbol}:`);
        existingData.forEach((row: any) => {
          console.log(`    - ID: ${row.id}`);
          console.log(`    - Date données: ${row.date}`);
          console.log(`    - Créé le: ${row.created_at}`);
          console.log(`    - Points: ${row.total_points}`);
        });
        
        console.log(`⏭️  Conservation des données existantes - passage au suivant...`);
        
        // Ajouter aux résultats sans traiter
        results.push({
          symbol: market.symbol,
          marketType: market.marketType,
          name: market.name,
          success: false,
          error: 'Données déjà existantes - conservées'
        });
        
        continue; // Passer au marché suivant
      }

      // Traiter avec le nouveau service
      const result = await service.processMarketAsset(market.symbol, market.marketType);
      
      if (result.success) {
        console.log(`✅ ${market.name}: ${result.segmentsCreated} segments créés`);
        console.log(`🔗 Stock Data ID: ${result.stockDataId}`);
        console.log(`📅 Date des données: ${result.dataDate}`);
        
        results.push({
          symbol: market.symbol,
          marketType: market.marketType,
          name: market.name,
          success: true,
          segmentsCreated: result.segmentsCreated,
          stockDataId: result.stockDataId,
          dataDate: result.dataDate
        });
      } else {
        console.error(`❌ ${market.name}: ${result.message}`);
        results.push({
          symbol: market.symbol,
          marketType: market.marketType,
          name: market.name,
          success: false,
          error: result.message
        });
      }

      // Pause pour respecter les limites de l'API Alpha Vantage
      console.log('⏳ Pause de 2 secondes pour respecter les limites API...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`💥 Erreur pour ${market.name}:`, error);
      results.push({
        symbol: market.symbol,
        marketType: market.marketType,
        name: market.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Résumé final avec dates
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n📊 Résumé de l\'ajout des nouveaux marchés:');
  console.log('==========================================');
  console.log(`⏱️  Durée totale: ${duration} secondes`);
  
  const successful = results.filter(r => r.success);
  const preserved = results.filter(r => !r.success && r.error === 'Données déjà existantes - conservées');
  const failed = results.filter(r => !r.success && r.error !== 'Données déjà existantes - conservées');
  
  console.log(`✅ Nouveaux actifs ajoutés: ${successful.length}`);
  console.log(`💾 Actifs déjà existants: ${preserved.length}`);
  console.log(`❌ Actifs en échec: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n📈 Nouveaux actifs ajoutés avec succès:');
    successful.forEach(r => {
      console.log(`  - ${r.name} (${r.symbol}) [${r.marketType}]:`);
      console.log(`    📊 ${r.segmentsCreated} segments créés`);
      console.log(`    📅 Date des données: ${r.dataDate}`);
      console.log(`    🔗 Stock Data ID: ${r.stockDataId}`);
    });
  }
  
  if (preserved.length > 0) {
    console.log('\n💾 Actifs déjà existants (conservés):');
    preserved.forEach(r => {
      console.log(`  - ${r.name} (${r.symbol}) [${r.marketType}]: Données existantes conservées`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n💥 Actifs en échec:');
    failed.forEach(r => {
      console.log(`  - ${r.name} (${r.symbol}) [${r.marketType}]: ${r.error}`);
    });
  }

  // Vérification finale
  console.log('\n🔍 Vérification finale des données...');
  
  try {
    const finalStats = await sql`
      SELECT 
        market_type,
        COUNT(*) as record_count,
        COUNT(DISTINCT symbol) as unique_symbols,
        SUM(total_points) as total_data_points
      FROM stock_data 
      GROUP BY market_type
      ORDER BY market_type
    `;
    
    console.log('\n📊 Statistiques finales par type de marché:');
    finalStats.forEach((row: any) => {
      console.log(`  - ${row.market_type}: ${row.record_count} enregistrements, ${row.unique_symbols} symboles, ${row.total_data_points} points de données`);
    });

    // Vérification des relations
    const relationCheck = await sql`
      SELECT 
        sd.market_type,
        COUNT(DISTINCT sd.id) as stock_data_count,
        COUNT(ar.id) as analysis_results_count
      FROM stock_data sd
      LEFT JOIN analysis_results ar ON sd.id = ar.stock_data_id
      GROUP BY sd.market_type
      ORDER BY sd.market_type
    `;
    
    console.log('\n🔗 Vérification des relations:');
    relationCheck.forEach((row: any) => {
      console.log(`  - ${row.market_type}: ${row.stock_data_count} stock_data, ${row.analysis_results_count} analyses`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification finale:', error);
  }

  console.log('\n🎉 Ajout des nouveaux marchés terminé !');
  console.log('=======================================');
}

// Exécution du script
if (require.main === module) {
  addNewMarkets().catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
}

export { addNewMarkets };
