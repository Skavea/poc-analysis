import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { createAnalysisResultImage } from '@/lib/chartImageGenerator';
import { neon } from '@neondatabase/serverless';

/**
 * API: Regenerate Images
 * ======================
 *
 * Supprime puis régénère les images associées à tous les segments
 */
export async function POST(req: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    const sql = neon(databaseUrl);

    const allResults = await DatabaseService.getAllAnalysisResults();

    let regenerated = 0;
    for (const seg of allResults) {
      try {
        const full = await DatabaseService.getSegmentData(seg.id);
        if (!full) continue;

        const imageSegmentData = {
          id: full.id,
          pointsData: (full.pointsData as Array<{ timestamp: string; open: number; high: number; low: number; close: number; volume: number }>) || [],
          minPrice: Number(full.minPrice),
          maxPrice: Number(full.maxPrice),
          averagePrice: Number(full.averagePrice),
          x0: Number(full.x0),
          patternPoint: full.patternPoint as string | null,
        };

        const imageData = createAnalysisResultImage(seg.id, imageSegmentData, 800, 400);

        // Supprime l'ancienne image et insère la nouvelle
        await sql`DELETE FROM analysis_results_images WHERE analysis_result_id = ${seg.id}`;
        await sql`
          INSERT INTO analysis_results_images (id, analysis_result_id, img_data)
          VALUES (${imageData.id}, ${imageData.analysisResultId}, ${imageData.imgData})
        `;
        regenerated++;
      } catch (e) {
        console.error('Failed to regenerate image for segment', seg.id, e);
        // Continuer avec les autres segments
      }
    }

    return NextResponse.json({ success: true, count: regenerated });
  } catch (error) {
    console.error('Error in regenerate-images API:', error);
    return NextResponse.json({ success: false, error: 'Failed to regenerate images' }, { status: 500 });
  }
}


