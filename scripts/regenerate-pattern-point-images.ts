/**
 * Script: Régénération des images pour les segments avec pattern_point
 * =====================================================================
 * 
 * Ce script régénère les images des segments qui ont un pattern_point défini,
 * en affichant le pattern_point comme un point VERT sur le graphique.
 * 
 * Usage:
 *   npx tsx scripts/regenerate-pattern-point-images.ts
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createAnalysisResultImage } from '../src/lib/chartImageGenerator';

// Charger les variables d'environnement depuis .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = dotenv.parse(envContent);
  
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

interface AnalysisResultRow {
  id: string;
  symbol: string;
  date: string;
  x0: string;
  min_price: string;
  max_price: string;
  average_price: string;
  pattern_point: string;
  points_data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

/**
 * Récupère tous les segments qui ont un pattern_point défini
 */
async function getSegmentsWithPatternPoint(): Promise<AnalysisResultRow[]> {
  console.log('📊 Récupération des segments avec pattern_point...');
  
  const results = await sql`
    SELECT 
      ar.id, 
      ar.symbol, 
      ar.date, 
      ar.x0, 
      ar.min_price, 
      ar.max_price, 
      ar.average_price, 
      ar.points_data,
      ar.pattern_point
    FROM analysis_results ar
    WHERE ar.pattern_point IS NOT NULL
    ORDER BY ar.created_at DESC
  `;
  
  return results as AnalysisResultRow[];
}

/**
 * Régénère l'image d'un segment avec le pattern_point en vert
 */
async function regenerateSegmentImage(segment: AnalysisResultRow): Promise<boolean> {
  try {
    // Préparer les données pour la génération d'image
    const segmentData = {
      id: segment.id,
      pointsData: segment.points_data,
      minPrice: parseFloat(segment.min_price),
      maxPrice: parseFloat(segment.max_price),
      averagePrice: parseFloat(segment.average_price),
      x0: parseFloat(segment.x0),
      patternPoint: segment.pattern_point, // ✅ Le pattern_point sera affiché en VERT
    };
    
    // Générer la nouvelle image base64
    const imageData = createAnalysisResultImage(
      segment.id,
      segmentData,
      800,
      400
    );
    
    // Supprimer l'ancienne image
    await sql`
      DELETE FROM analysis_results_images
      WHERE analysis_result_id = ${segment.id}
    `;
    
    // Insérer la nouvelle image
    await sql`
      INSERT INTO analysis_results_images (
        id, analysis_result_id, img_data
      ) VALUES (
        ${imageData.id},
        ${imageData.analysisResultId},
        ${imageData.imgData}
      )
    `;
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la régénération de l'image pour ${segment.id}:`, error);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de la régénération des images avec pattern_point\n');
  console.log('🟢 Les pattern_points seront affichés en VERT sur les graphiques\n');
  
  try {
    // Récupérer les segments avec pattern_point
    const segments = await getSegmentsWithPatternPoint();
    
    if (segments.length === 0) {
      console.log('✅ Aucun segment avec pattern_point trouvé.');
      console.log('   Tous les segments ont pattern_point = NULL\n');
      return;
    }
    
    console.log(`📦 ${segments.length} segment(s) trouvé(s) avec pattern_point\n`);
    
    // Afficher quelques exemples
    console.log('📋 Exemples de segments:');
    segments.slice(0, 5).forEach((seg, idx) => {
      console.log(`   ${idx + 1}. ${seg.symbol} - ${seg.id.substring(0, 30)}...`);
      console.log(`      pattern_point: ${seg.pattern_point}`);
    });
    if (segments.length > 5) {
      console.log(`   ... et ${segments.length - 5} autres`);
    }
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Régénérer les images pour chaque segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const progress = `[${i + 1}/${segments.length}]`;
      
      process.stdout.write(`${progress} Régénération pour ${segment.symbol} (${segment.id.substring(0, 20)}...)...`);
      
      const success = await regenerateSegmentImage(segment);
      
      if (success) {
        successCount++;
        console.log(' ✓');
      } else {
        errorCount++;
        console.log(' ✗');
      }
      
      // Petit délai pour ne pas surcharger la base de données
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Résumé
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ DE LA RÉGÉNÉRATION');
    console.log('='.repeat(70));
    console.log(`✅ Images régénérées avec succès : ${successCount}`);
    console.log(`❌ Erreurs : ${errorCount}`);
    console.log(`📦 Total traité : ${segments.length}`);
    console.log('='.repeat(70) + '\n');
    
    if (successCount === segments.length) {
      console.log('🎉 Toutes les images ont été régénérées avec succès !');
      console.log('🟢 Les pattern_points sont maintenant affichés en VERT sur les graphiques\n');
    } else if (successCount > 0) {
      console.log('⚠️  Certaines images n\'ont pas pu être régénérées.');
      console.log('   Vérifiez les erreurs ci-dessus.\n');
    } else {
      console.log('❌ Aucune image n\'a pu être régénérée.');
      console.log('   Vérifiez la configuration et les logs d\'erreur.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur critique lors de la régénération des images:', error);
    process.exit(1);
  }
}

// Exécuter le script
main()
  .then(() => {
    console.log('✅ Script terminé\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

