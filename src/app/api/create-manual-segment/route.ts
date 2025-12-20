/**
 * API Route: Create Manual Segment
 * =================================
 * 
 * Endpoint pour créer un segment manuellement à partir de deux timestamps sélectionnés
 */

import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisService } from '@/lib/stockAnalysisService';
import { DatabaseService } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { 
      stockDataId, 
      symbol, 
      date, 
      startTimestamp, 
      endTimestamp, 
      schemaType, 
      patternPoint,
      previousSegmentId,
      isResultCorrect,
      resultInterval
    } = await request.json();

    if (!stockDataId || !symbol || !date || !startTimestamp || !endTimestamp) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Récupérer les données du marché
    const stockData = await DatabaseService.getStockDataById(stockDataId);
    if (!stockData) {
      return NextResponse.json(
        { error: 'Données de marché non trouvées' },
        { status: 404 }
      );
    }

    const data = stockData.data as Record<string, unknown>;
    const allTimestamps = Object.keys(data).sort();

    // Trouver tous les timestamps entre startTimestamp et endTimestamp (inclus)
    const startTime = new Date(startTimestamp).getTime();
    const endTime = new Date(endTimestamp).getTime();

    const segmentTimestamps = allTimestamps.filter(ts => {
      const tsTime = new Date(ts).getTime();
      return tsTime >= startTime && tsTime <= endTime;
    });

    if (segmentTimestamps.length < 6) {
      return NextResponse.json(
        { error: 'Le segment doit contenir au moins 6 points' },
        { status: 400 }
      );
    }

    // Calculer le segment en utilisant createManualSegment
    const service = StockAnalysisService.getInstance();
    
    const segment = service.createManualSegment(
      symbol,
      date,
      startTimestamp,
      endTimestamp,
      data,
      schemaType || null,
      patternPoint || null
    );

    if (!segment) {
      return NextResponse.json(
        { error: 'Impossible de calculer le segment avec les points sélectionnés' },
        { status: 400 }
      );
    }

    // Sauvegarder le segment avec schemaType et patternPoint
    await service.saveManualSegment(segment, stockDataId, schemaType || null, patternPoint || null);

    // Si un feedback est fourni pour le segment précédent, le sauvegarder
    if (previousSegmentId && isResultCorrect !== null && isResultCorrect !== undefined) {
      const { neon } = await import('@neondatabase/serverless');
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      const sql = neon(databaseUrl);
      
      await sql`
        UPDATE analysis_results
        SET is_result_correct = ${isResultCorrect},
            result_interval = ${resultInterval || null}
        WHERE id = ${previousSegmentId}
      `;
    }

    // Récupérer le segment créé complet depuis la base de données
    const createdSegment = await DatabaseService.getSegmentData(segment.id);

    return NextResponse.json({
      success: true,
      message: 'Segment créé avec succès',
      data: {
        segment: createdSegment,
        segmentId: segment.id,
        pointCount: segment.pointCount,
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création du segment manuel:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création du segment',
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}

