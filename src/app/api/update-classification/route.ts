/**
 * API Route: Update Classification
 * ===============================
 * 
 * Updates both schema type and pattern point classification for a segment
 * and regenerates the chart image to reflect the pattern point
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { createAnalysisResultImage } from '@/lib/chartImageGenerator';
import { neon } from '@neondatabase/serverless';

export async function POST(request: NextRequest) {
  try {
    const { segmentId, schemaType, patternPoint } = await request.json();
    
    // Validation des paramètres requis
    if (!segmentId) {
      return NextResponse.json(
        { error: 'Missing segmentId parameter' },
        { status: 400 }
      );
    }

    if (!schemaType || !['R', 'V', 'UNCLASSIFIED'].includes(schemaType)) {
      return NextResponse.json(
        { error: 'Invalid schemaType. Must be R, V, or UNCLASSIFIED' },
        { status: 400 }
      );
    }

    // Validation du pattern point
    if (patternPoint !== null && patternPoint !== 'unclassified' && !patternPoint) {
      return NextResponse.json(
        { error: 'Invalid patternPoint. Must be null, "unclassified", or a valid timestamp' },
        { status: 400 }
      );
    }

    // Vérifier que le segment existe et récupérer ses données
    const segmentData = await DatabaseService.getSegmentData(segmentId);
    if (!segmentData) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // Mettre à jour la classification
    const updateData = {
      schemaType,
      patternPoint: patternPoint // null pour "no" ou "unclassified", timestamp pour "yes"
    };

    const success = await DatabaseService.updateAnalysisResult(segmentId, updateData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update classification' },
        { status: 500 }
      );
    }

    // Régénérer l'image du graphique avec le nouveau pattern point
    try {
      const databaseUrl = process.env.DATABASE_URL || '';
      const sql = neon(databaseUrl);
      
      // Préparer les données pour la génération d'image
      const imageSegmentData = {
        id: segmentData.id,
        pointsData: segmentData.pointsData as Array<{
          timestamp: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>,
        minPrice: parseFloat(String(segmentData.minPrice)),
        maxPrice: parseFloat(String(segmentData.maxPrice)),
        averagePrice: parseFloat(String(segmentData.averagePrice)),
        x0: parseFloat(String(segmentData.x0)),
        patternPoint: patternPoint,
      };
      
      // Générer la nouvelle image
      const imageData = createAnalysisResultImage(
        segmentId,
        imageSegmentData,
        800,
        400
      );
      
      // Supprimer l'ancienne image et insérer la nouvelle
      await sql`
        DELETE FROM analysis_results_images
        WHERE analysis_result_id = ${segmentId}
      `;
      
      await sql`
        INSERT INTO analysis_results_images (
          id, analysis_result_id, img_data
        ) VALUES (
          ${imageData.id},
          ${imageData.analysisResultId},
          ${imageData.imgData}
        )
      `;
      
      console.log(`✅ Image régénérée pour le segment ${segmentId} avec pattern_point=${patternPoint}`);
    } catch (imageError) {
      console.error('Erreur lors de la régénération de l\'image:', imageError);
      // On continue même si l'image n'a pas pu être régénérée
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Classification updated successfully',
      data: updateData
    });

  } catch (error) {
    console.error('Error updating classification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
