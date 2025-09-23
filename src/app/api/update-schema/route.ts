/**
 * API Route: Update Schema
 * ========================
 * 
 * Endpoint to update segment classification schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { segmentId, schemaType } = await request.json();
    
    if (!segmentId || !schemaType) {
      return NextResponse.json(
        { error: 'Segment ID and schema type are required' },
        { status: 400 }
      );
    }

    if (!['R', 'V', 'UNCLASSIFIED'].includes(schemaType)) {
      return NextResponse.json(
        { error: 'Invalid schema type. Must be R, V, or UNCLASSIFIED' },
        { status: 400 }
      );
    }

    await DatabaseService.updateAnalysisSchema(segmentId, schemaType);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating schema:', error);
    return NextResponse.json(
      { error: 'Failed to update schema' },
      { status: 500 }
    );
  }
}
