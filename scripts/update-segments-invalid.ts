#!/usr/bin/env npx tsx
/**
 * Script de Mise à Jour des Segments Existants
 * =============================================
 * 
 * Met à jour la colonne 'invalid' pour tous les segments existants en base.
 * Un segment est considéré comme invalide s'il n'a pas de séquence continue
 * de points d'une minute (60 secondes) dans points_data.
 * 
 * Usage: npx tsx scripts/update-segments-invalid.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Charger les variables d'environnement
config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(databaseUrl);

/**
 * Vérifie si un segment a une chaîne temporelle continue avec un gap maximum d'une minute.
 * Un segment est valide si tous les points consécutifs dans points_data ont un écart
 * maximum d'une minute entre eux. On parse les timestamps pour extraire l'heure et les minutes.
 * 
 * @param pointsData - Tableau de points avec leurs timestamps
 * @returns true si le segment est valide (tous les points consécutifs ont un gap <= 1 minute), false sinon
 */
function isValidSegment(pointsData: Array<{ timestamp: string }>): boolean {
  if (!pointsData || pointsData.length < 2) {
    return false;
  }

  // Trier les points par timestamp pour s'assurer qu'ils sont dans l'ordre chronologique
  const sortedPoints = [...pointsData].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Fonction helper pour extraire l'heure, les minutes et les secondes d'un timestamp
  const getTimeComponents = (timestamp: string): { hours: number; minutes: number; seconds: number } => {
    const date = new Date(timestamp);
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds()
    };
  };

  // Vérifier que tous les points consécutifs ont un écart maximum d'une minute
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const current = getTimeComponents(sortedPoints[i].timestamp);
    const next = getTimeComponents(sortedPoints[i + 1].timestamp);
    
    // Calculer la différence en secondes entre les deux timestamps
    const currentDate = new Date(sortedPoints[i].timestamp);
    const nextDate = new Date(sortedPoints[i + 1].timestamp);
    const diffSeconds = (nextDate.getTime() - currentDate.getTime()) / 1000;
    
    // Si l'écart entre deux points consécutifs dépasse 60 secondes (1 minute), le segment est invalide
    if (diffSeconds > 60) {
      return false;
    }
  }

  // Si tous les écarts sont <= 1 minute, le segment est valide
  return true;
}

async function updateAllSegments() {
  console.log('🚀 Début de la mise à jour des segments existants...');
  console.log('==================================================');
  
  try {
    // 1. Vérification de la connexion
    console.log('📋 Vérification de la connexion à la base de données...');
    await sql`SELECT 1`;
    console.log('✅ Connexion établie');

    // 2. Vérifier que la colonne invalid existe
    console.log('\n🔍 Vérification de la colonne invalid...');
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analysis_results' AND column_name = 'invalid'
    `;
    
    if (columnCheck.length === 0) {
      console.error('❌ La colonne "invalid" n\'existe pas. Veuillez d\'abord exécuter la migration SQL.');
      console.log('💡 Exécutez: psql $DATABASE_URL -f scripts/add-invalid-column.sql');
      process.exit(1);
    }
    console.log('✅ Colonne invalid trouvée');

    // 3. Récupérer tous les segments
    console.log('\n📊 Récupération de tous les segments...');
    const segments = await sql`
      SELECT id, points_data 
      FROM analysis_results
      WHERE points_data IS NOT NULL
    `;
    
    console.log(`📈 ${segments.length} segments trouvés`);

    // 4. Traiter chaque segment
    console.log('\n🔄 Mise à jour des segments...');
    let updatedCount = 0;
    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;

    for (const segment of segments) {
      try {
        const pointsData = segment.points_data as Array<{ timestamp: string }> | null;
        
        if (!pointsData || !Array.isArray(pointsData)) {
          // Si pas de points_data valide, marquer comme invalide
          await sql`
            UPDATE analysis_results 
            SET invalid = true 
            WHERE id = ${segment.id}
          `;
          invalidCount++;
          updatedCount++;
          continue;
        }

        const isValid = isValidSegment(pointsData);
        const isInvalid = !isValid;

        await sql`
          UPDATE analysis_results 
          SET invalid = ${isInvalid}
          WHERE id = ${segment.id}
        `;

        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
        updatedCount++;

        // Afficher la progression tous les 100 segments
        if (updatedCount % 100 === 0) {
          console.log(`   ✅ ${updatedCount}/${segments.length} segments traités...`);
        }
      } catch (error) {
        console.error(`   ❌ Erreur lors du traitement du segment ${segment.id}:`, error);
        errorCount++;
      }
    }

    // 5. Résumé
    console.log('\n📊 Résumé de la mise à jour:');
    console.log('================================');
    console.log(`✅ Segments valides (invalid = false): ${validCount}`);
    console.log(`❌ Segments invalides (invalid = true): ${invalidCount}`);
    console.log(`⚠️  Erreurs: ${errorCount}`);
    console.log(`📈 Total traité: ${updatedCount}/${segments.length}`);

    // 6. Vérification finale
    console.log('\n🔍 Vérification finale...');
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE invalid = false) as valid,
        COUNT(*) FILTER (WHERE invalid = true) as invalid
      FROM analysis_results
    `;
    
    console.log(`📊 Total segments en base: ${finalStats[0].total}`);
    console.log(`✅ Segments valides: ${finalStats[0].valid}`);
    console.log(`❌ Segments invalides: ${finalStats[0].invalid}`);

    console.log('\n✅ Mise à jour terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  }
}

// Exécuter le script
updateAllSegments().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

