/**
 * API Route for Server-Side Chart SVG Generation
 * =============================================
 * 
 * This endpoint generates SVG charts on the server using React Server Components
 * It takes segment data and returns an SVG image that can be stored
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { renderToStaticMarkup } from 'react-dom/server';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';

export async function POST(request: NextRequest) {
  try {
    const { segmentId, width = 800, height = 400 } = await request.json();
    
    if (!segmentId) {
      return NextResponse.json(
        { error: 'Missing segmentId parameter' },
        { status: 400 }
      );
    }

    // Get segment data from database
    const segmentData = await DatabaseService.getSegmentData(segmentId);
    if (!segmentData) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    const { pointsData, x0, minPrice, maxPrice, averagePrice } = segmentData;
    
    // Calculate Y-axis domain with percentage-based padding (7%)
    const minPriceNum = Number(minPrice);
    const maxPriceNum = Number(maxPrice);
    const priceRange = maxPriceNum - minPriceNum;
    const paddingPercentage = 0.07; // 7% padding
    const padding = priceRange * paddingPercentage;
    const yAxisMin = minPriceNum - padding;
    const yAxisMax = maxPriceNum + padding;

    // Generate SVG using React components
    const svgContent = renderToStaticMarkup(
      <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
        <LineChart width={width} height={height} data={pointsData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            label={{ value: 'Time', position: 'bottom' }}
            tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }}
          />
          <YAxis 
            domain={[yAxisMin, yAxisMax]} 
            label={{ value: 'Price ($)', angle: -90, position: 'left' }}
          />
          
          {/* Reference lines */}
          <ReferenceLine y={Number(averagePrice)} stroke="#8b5cf6" strokeDasharray="5 5" />
          <ReferenceLine y={Number(minPrice)} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={Number(maxPrice)} stroke="#10b981" strokeDasharray="3 3" />
          
          <Line 
            type="linear" 
            dataKey="close" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#ef4444', stroke: '#dc2626' }}
          />
        </LineChart>
      </svg>
    );

    // Return SVG content with appropriate headers
    return new NextResponse(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="chart-${segmentId}.svg"`,
      },
    });
  } catch (error) {
    console.error('Error generating chart:', error);
    return NextResponse.json(
      { error: 'Failed to generate chart' },
      { status: 500 }
    );
  }
}
