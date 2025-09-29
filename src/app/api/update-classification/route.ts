/**
 * API Route: Update Classification
 * ===============================
 * 
 * Updates both schema type and pattern point classification for a segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

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

    // Vérifier que le segment existe
    const segmentExists = await DatabaseService.getSegmentData(segmentId);
    if (!segmentExists) {
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
