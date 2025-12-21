/**
 * API Route: Update Segment Feedback
 * ===================================
 * 
 * Endpoint pour mettre à jour le feedback d'un segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: NextRequest) {
  try {
    const { segmentId, isResultCorrect, resultInterval } = await request.json();

    if (!segmentId || !isResultCorrect || !isResultCorrect.trim()) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const sql = neon(databaseUrl);

    await sql`
      UPDATE analysis_results
      SET is_result_correct = ${isResultCorrect},
          result_interval = ${resultInterval && resultInterval.trim() ? resultInterval.trim() : null}
      WHERE id = ${segmentId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Feedback enregistré avec succès',
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du feedback:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour du feedback',
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}

