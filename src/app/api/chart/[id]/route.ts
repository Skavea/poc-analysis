/**
 * API Route for Retrieving Chart SVGs from Database
 * ===============================================
 * 
 * This endpoint retrieves stored SVG charts from the database by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Handle both direct chart IDs and segment IDs
    let chartImage;
    
    if (id.startsWith('chart_')) {
      // Direct chart ID
      chartImage = await DatabaseService.getChartImageById(id);
    } else {
      // Segment ID - get latest chart for this segment
      chartImage = await DatabaseService.getLatestChartForSegment(id);
    }
    
    if (!chartImage) {
      return NextResponse.json(
        { error: 'Chart not found' },
        { status: 404 }
      );
    }
    
    // Determine content type based on format
    const contentType = chartImage.format === 'png' 
      ? 'image/png' 
      : 'image/svg+xml';
    
    // Return the chart content directly as SVG
    return new NextResponse(chartImage.svgContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error retrieving chart:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chart' },
      { status: 500 }
    );
  }
}
