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
      resultInterval,
      result
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

    // S'assurer que startTimestamp < endTimestamp (inverser si nécessaire)
    let actualStartTime = new Date(startTimestamp).getTime();
    let actualEndTime = new Date(endTimestamp).getTime();
    
    if (actualStartTime > actualEndTime) {
      // Inverser si nécessaire
      [actualStartTime, actualEndTime] = [actualEndTime, actualStartTime];
    }

    // Trouver tous les timestamps entre startTimestamp et endTimestamp (inclus)
    const segmentTimestamps = allTimestamps.filter(ts => {
      const tsTime = new Date(ts).getTime();
      return tsTime >= actualStartTime && tsTime <= actualEndTime;
    });

    if (segmentTimestamps.length < 6) {
      return NextResponse.json(
        { error: 'Le segment doit contenir au moins 6 points' },
        { status: 400 }
      );
    }

    // Calculer le segment en utilisant createManualSegment
    // Utiliser les timestamps triés pour s'assurer que start < end
    const service = StockAnalysisService.getInstance();
    
    // Déterminer les timestamps triés en fonction de actualStartTime et actualEndTime
    let sortedStartTimestamp = actualStartTime === new Date(startTimestamp).getTime() 
      ? startTimestamp 
      : endTimestamp;
    let sortedEndTimestamp = actualEndTime === new Date(endTimestamp).getTime() 
      ? endTimestamp 
      : startTimestamp;
    
    // Vérification supplémentaire : s'assurer que sortedStartTimestamp < sortedEndTimestamp
    const finalStartTime = new Date(sortedStartTimestamp).getTime();
    const finalEndTime = new Date(sortedEndTimestamp).getTime();
    
    if (finalStartTime > finalEndTime) {
      // Si toujours inversé, corriger
      [sortedStartTimestamp, sortedEndTimestamp] = [sortedEndTimestamp, sortedStartTimestamp];
    }
    
    const segment = service.createManualSegment(
      symbol,
      date,
      sortedStartTimestamp,
      sortedEndTimestamp,
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
    if (previousSegmentId && isResultCorrect && isResultCorrect.trim()) {
      const { neon } = await import('@neondatabase/serverless');
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      const sql = neon(databaseUrl);
      
      await sql`
        UPDATE analysis_results
        SET is_result_correct = ${isResultCorrect && isResultCorrect.trim() ? isResultCorrect.trim() : null},
            result_interval = ${resultInterval && resultInterval.trim() ? resultInterval.trim() : null},
            result = ${result && result.trim() ? result.trim() : null}
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

