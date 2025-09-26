/**
 * API Route for Saving Chart SVGs to Database
 * ==========================================
 * 
 * This endpoint saves generated SVG charts to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { chartFormatSchema } from '@/lib/schema';
import { z } from 'zod';

// Validation schema
const saveChartRequestSchema = z.object({
  segmentId: z.string().min(1),
  svgContent: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: chartFormatSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = saveChartRequestSchema.parse(body);
    
    // Save chart to database
    const chartId = await DatabaseService.saveChartImage(validatedData);
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      chartId,
      message: 'Chart saved successfully'
    });
  } catch (error) {
    console.error('Error saving chart:', error);
    
    // Return appropriate error response
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save chart' },
      { status: 500 }
    );
  }
}
