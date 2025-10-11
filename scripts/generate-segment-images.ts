/**
 * Script: Génération des images pour les segments existants
 * =========================================================
 * 
 * Ce script génère des images base64 pour tous les segments qui n'en ont pas encore.
 * Les images sont générées à partir des données de points du segment et stockées
 * dans la table analysis_results_images.
 * 
 * Usage:
 *   npm run generate:images
 *   
 * ou directement avec tsx:
 *   tsx scripts/generate-segment-images.ts
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { createAnalysisResultImage } from '../src/lib/chartImageGenerator';

// Charger les variables d'environnement
config();

const sql = neon(process.env.DATABASE_URL!);

interface AnalysisResultRow {
  id: string;
  symbol: string;
  date: string;
  x0: string;
  min_price: string;
  max_price: string;
  average_price: string;
  points_data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  pattern_point: string | null;
}

/**
 * Récupère tous les segments qui n'ont pas d'image associée
 */
async function getSegmentsWithoutImage(): Promise<AnalysisResultRow[]> {
  console.log('📊 Récupération des segments sans image...');
  
  const results = await sql`
    SELECT ar.id, ar.symbol, ar.date, ar.x0, ar.min_price, ar.max_price, 
           ar.average_price, ar.points_data, ar.pattern_point
    FROM analysis_results ar
    LEFT JOIN analysis_results_images ari ON ar.id = ari.analysis_result_id
    WHERE ari.id IS NULL
    ORDER BY ar.created_at DESC
  `;
  
  return results as AnalysisResultRow[];
}

/**
 * Génère et sauvegarde l'image d'un segment
 */
async function generateAndSaveSegmentImage(segment: AnalysisResultRow): Promise<boolean> {
  try {
    // Préparer les données pour la génération d'image
    const segmentData = {
      id: segment.id,
      pointsData: segment.points_data,
      minPrice: parseFloat(segment.min_price),
      maxPrice: parseFloat(segment.max_price),
      averagePrice: parseFloat(segment.average_price),
      x0: parseFloat(segment.x0),
      patternPoint: segment.pattern_point,
    };
    
    // Générer l'image base64
    const imageData = createAnalysisResultImage(
      segment.id,
      segmentData,
      800,
      400
    );
    
    // Sauvegarder dans la base de données
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
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la génération de l'image pour ${segment.id}:`, error);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de la génération des images de segments\n');
  
  try {
    // Récupérer les segments sans image
    const segments = await getSegmentsWithoutImage();
    
    if (segments.length === 0) {
      console.log('✅ Tous les segments ont déjà une image associée !');
      return;
    }
    
    console.log(`📦 ${segments.length} segment(s) trouvé(s) sans image\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Générer les images pour chaque segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const progress = `[${i + 1}/${segments.length}]`;
      
      process.stdout.write(`${progress} Génération de l'image pour ${segment.symbol} (${segment.id})...`);
      
      const success = await generateAndSaveSegmentImage(segment);
      
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
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE LA GÉNÉRATION');
    console.log('='.repeat(60));
    console.log(`✅ Images générées avec succès : ${successCount}`);
    console.log(`❌ Erreurs : ${errorCount}`);
    console.log(`📦 Total traité : ${segments.length}`);
    console.log('='.repeat(60) + '\n');
    
    if (successCount === segments.length) {
      console.log('🎉 Toutes les images ont été générées avec succès !');
    } else if (successCount > 0) {
      console.log('⚠️  Certaines images n\'ont pas pu être générées. Vérifiez les erreurs ci-dessus.');
    } else {
      console.log('❌ Aucune image n\'a pu être générée. Vérifiez la configuration.');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur critique lors de la génération des images:', error);
    process.exit(1);
  }
}

// Exécuter le script
main()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

