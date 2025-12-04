/**
 * API Route: ML Classification
 * ============================
 * 
 * Classe tous les segments non classés par ML et met à jour
 * uniquement schema_type (R/V) ainsi que ml_classed.
 */

import { NextRequest, NextResponse } from 'next/server';

// Forcer le runtime Node.js pour pouvoir charger tfjs-node (native bindings)
export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const sql = neon(databaseUrl);

    const { loadMlModel } = await import('@/lib/ml/modelLoader');
    const { classifySegment, classifySegmentsBatch, modelName } = await loadMlModel() as any;
    
    // Log pour vérifier que le nom du modèle est bien récupéré
    console.log(`🤖 Utilisation du modèle: ${modelName}`);

    // Récupère les segments à classer par ML
    const rows = await sql`
      SELECT 
        id, symbol, date, points_data, invalid, ml_classed, ml_result, schema_type
      FROM analysis_results
      WHERE 
        invalid = FALSE 
        AND schema_type = 'UNCLASSIFIED'
        AND (ml_classed = FALSE OR ml_result = 'UNCLASSIFIED')
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No segments to classify',
        updated: 0
      });
    }

    // Prédire par lots pour réduire le coût CPU/JS
    const scanned = rows.length as number;
    const batchSize = 64;
    let updated = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = (rows as any[]).slice(i, i + batchSize);
      const inputs = chunk.map((row) => ({
        id: row.id as string,
        symbol: row.symbol as string,
        date: row.date as string,
        points_data: row.points_data as Array<{
          timestamp: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>
      }));
      const labels: Array<'R' | 'V'> = typeof classifySegmentsBatch === 'function'
        ? await classifySegmentsBatch(inputs)
        : await Promise.all(inputs.map((inp) => classifySegment(inp)));

      // Mises à jour séquentielles (peu nombreuses par chunk); on peut optimiser en SQL batch si besoin
      for (let k = 0; k < chunk.length; k++) {
        const row = chunk[k];
        const mlSchema = labels[k] === 'V' ? 'V' : 'R';
        await sql`
          UPDATE analysis_results
          SET 
            ml_classed = TRUE,
            schema_type = CASE WHEN schema_type = 'UNCLASSIFIED' THEN ${mlSchema} ELSE schema_type END,
            ml_result = CASE 
              WHEN ml_result = 'TRUE' OR ml_result = 'FALSE' THEN ml_result
              ELSE 'UNCLASSIFIED'
            END,
            ml_model_name = ${modelName}
          WHERE id = ${row.id} 
            AND schema_type = 'UNCLASSIFIED'
        `;
        updated += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ML classification completed',
      scanned,
      updated
    });
  } catch (error) {
    console.error('Error in ML classification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


