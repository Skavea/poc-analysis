import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('id');
    
    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 });
    }
    
    console.log('Testing segment data for ID:', segmentId);
    const data = await DatabaseService.getSegmentData(segmentId);
    console.log('Segment data result:', data);
    
    return NextResponse.json({ 
      success: true, 
      data,
      segmentId 
    });
  } catch (error) {
    console.error('Error in test-segment API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch segment data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
