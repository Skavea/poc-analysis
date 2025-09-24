/**
 * API Route: Update Schema
 * ======================
 * 
 * Updates the schema type (R/V/UNCLASSIFIED) for a segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { schemaTypeSchema } from '@/lib/schema';
import { z } from 'zod';

// Request schema validation
const updateSchemaSchema = z.object({
  segmentId: z.string(),
  schemaType: schemaTypeSchema
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { segmentId, schemaType } = updateSchemaSchema.parse(body);
    
    // Update the schema type in the database
    await DatabaseService.updateAnalysisSchema(segmentId, schemaType);
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: `Schema type updated to ${schemaType}` 
    });
    
  } catch (error) {
    console.error('Error updating schema:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.format() },
        { status: 400 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { success: false, message: 'Failed to update schema type' },
      { status: 500 }
    );
  }
}