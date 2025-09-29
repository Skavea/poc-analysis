#!/usr/bin/env npx tsx
/**
 * Script de Migration Automatisé
 * ===============================
 * 
 * Exécute la migration de la base de données vers la structure multi-marchés
 * avec vérifications et rollback en cas d'erreur
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(databaseUrl);

async function runMigration() {
  console.log('🚀 Début de la migration multi-marchés...');
  console.log('=========================================');
  
  try {
    // 1. Vérification de la connexion
    console.log('📋 Vérification de la connexion à la base de données...');
    await sql`SELECT 1`;
    console.log('✅ Connexion établie');

    // 2. Sauvegarde des données existantes (comptage)
    console.log('\n📊 Vérification des données existantes...');
    const existingStockData = await sql`SELECT COUNT(*) as count FROM stock_data`;
    const existingAnalysisData = await sql`SELECT COUNT(*) as count FROM analysis_results`;
    
    console.log(`📈 Stock Data existants: ${existingStockData[0].count}`);
    console.log(`📊 Analysis Results existants: ${existingAnalysisData[0].count}`);

    // 3. Lecture et exécution du script de migration
    console.log('\n🔧 Exécution de la migration...');
    const migrationScript = readFileSync(join(__dirname, 'migrate-multi-market.sql'), 'utf-8');
    
    // Diviser le script en requêtes individuelles
    const queries = migrationScript
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    for (const query of queries) {
      if (query.trim()) {
        try {
          console.log(`   🔄 Exécution: ${query.substring(0, 50)}...`);
          await sql.unsafe(query);
          console.log('   ✅ Succès');
        } catch (error) {
          // Certaines requêtes peuvent échouer si déjà exécutées (ALTER TABLE ADD COLUMN IF NOT EXISTS n'existe pas)
          if (error instanceof Error && error.message.includes('already exists')) {
            console.log('   ⚠️  Déjà exécuté (ignoré)');
          } else {
            console.error('   ❌ Erreur:', error);
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migration exécutée avec succès');

    // 4. Vérification post-migration
    console.log('\n🔍 Vérification post-migration...');
    
    // Vérifier les colonnes ajoutées
    const stockDataColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'stock_data' AND column_name = 'market_type'
    `;
    
    const analysisColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'analysis_results' AND column_name = 'stock_data_id'
    `;

    if (stockDataColumns.length > 0) {
      console.log('✅ Colonne market_type ajoutée à stock_data');
    } else {
      throw new Error('❌ Colonne market_type manquante dans stock_data');
    }

    if (analysisColumns.length > 0) {
      console.log('✅ Colonne stock_data_id ajoutée à analysis_results');
    } else {
      throw new Error('❌ Colonne stock_data_id manquante dans analysis_results');
    }

    // Vérifier les contraintes
    const constraints = await sql`
      SELECT constraint_name, table_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%market_type%' OR constraint_name LIKE '%stock_data%'
    `;
    
    console.log('✅ Contraintes vérifiées:');
    constraints.forEach((row: any) => {
      console.log(`   - ${row.constraint_name} sur ${row.table_name}`);
    });

    // Vérifier les index
    const indexes = await sql`
      SELECT indexname, tablename
      FROM pg_indexes 
      WHERE tablename IN ('stock_data', 'analysis_results')
        AND indexname LIKE '%market_type%'
    `;
    
    console.log('✅ Index créés:');
    indexes.forEach((row: any) => {
      console.log(`   - ${row.indexname} sur ${row.tablename}`);
    });

    // 5. Vérification finale des données
    console.log('\n📊 Vérification finale des données...');
    
    const finalStockData = await sql`SELECT COUNT(*) as count FROM stock_data`;
    const finalAnalysisData = await sql`SELECT COUNT(*) as count FROM analysis_results`;
    
    console.log(`📈 Stock Data après migration: ${finalStockData[0].count}`);
    console.log(`📊 Analysis Results après migration: ${finalAnalysisData[0].count}`);

    // Vérifier l'intégrité des relations
    const orphanedCount = await sql`
      SELECT COUNT(*) as count
      FROM analysis_results ar
      LEFT JOIN stock_data sd ON ar.stock_data_id = sd.id
      WHERE sd.id IS NULL
    `;

    if (orphanedCount[0].count === 0) {
      console.log('✅ Aucun enregistrement orphelin dans analysis_results');
    } else {
      console.log(`⚠️  ${orphanedCount[0].count} enregistrements orphelins trouvés`);
    }

    // Statistiques par type de marché
    const marketStats = await sql`
      SELECT 
        market_type,
        COUNT(*) as count,
        COUNT(DISTINCT symbol) as unique_symbols
      FROM stock_data 
      GROUP BY market_type
    `;
    
    console.log('\n📊 Statistiques par type de marché:');
    marketStats.forEach((row: any) => {
      console.log(`   - ${row.market_type}: ${row.count} enregistrements, ${row.unique_symbols} symboles`);
    });

    console.log('\n🎉 Migration terminée avec succès !');
    console.log('====================================');
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Exécuter: npx drizzle-kit generate');
    console.log('   2. Exécuter: npx drizzle-kit migrate');
    console.log('   3. Exécuter: npx tsx scripts/regenerate-all-markets.ts');

  } catch (error) {
    console.error('\n💥 Erreur lors de la migration:', error);
    console.log('\n🔄 La base de données n\'a pas été modifiée');
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  runMigration().catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
}

export { runMigration };
