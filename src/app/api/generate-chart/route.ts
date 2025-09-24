/**
 * API Route for Server-Side Chart SVG Generation
 * =============================================
 * 
 * This endpoint generates SVG charts on the server
 * It takes segment data and returns an SVG image that can be stored
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

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
    const avgPriceNum = Number(averagePrice);
    const priceRange = maxPriceNum - minPriceNum;
    const paddingPercentage = 0.07; // 7% padding
    const padding = priceRange * paddingPercentage;
    const yAxisMin = minPriceNum - padding;
    const yAxisMax = maxPriceNum + padding;

    // Generate SVG manually since we can't use JSX directly in the API route
    const svgContent = generateSVGChart(
      pointsData, 
      width, 
      height, 
      segmentId, 
      minPriceNum,
      maxPriceNum,
      avgPriceNum,
      yAxisMin,
      yAxisMax
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

/**
 * Generate an SVG chart as a string
 */
function generateSVGChart(
  pointsData: any[],
  width: number,
  height: number,
  segmentId: string,
  minPrice: number,
  maxPrice: number,
  averagePrice: number,
  yAxisMin: number,
  yAxisMax: number
): string {
  // Create SVG header
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
  
  // Add CSS styles
  svg += `
    <style>
      .chart-title { font-family: Arial; font-size: 14px; fill: #333; }
      .axis { stroke: #ccc; stroke-width: 1; }
      .grid { stroke: #e5e5e5; stroke-width: 0.5; stroke-dasharray: 3,3; }
      .data-line { stroke: #3b82f6; stroke-width: 2; fill: none; }
      .avg-line { stroke: #8b5cf6; stroke-width: 1; stroke-dasharray: 5,5; }
      .min-line { stroke: #ef4444; stroke-width: 1; stroke-dasharray: 3,3; }
      .max-line { stroke: #10b981; stroke-width: 1; stroke-dasharray: 3,3; }
      .label { font-family: Arial; font-size: 10px; fill: #666; }
      .data-point { fill: #3b82f6; }
      .last-point { fill: #ef4444; stroke: #dc2626; stroke-width: 1; r: 6; }
    </style>
  `;
  
  // Chart background
  svg += `<rect width="${width}" height="${height}" fill="white" />`;
  
  // Calculate chart dimensions with margins
  const margin = { top: 20, right: 30, left: 40, bottom: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Chart area
  svg += `<g transform="translate(${margin.left},${margin.top})">`;
  
  // Grid
  svg += `<rect x="0" y="0" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#e5e5e5" />`;
  
  // Reference lines for min, max, average
  const getYPosition = (value: number) => {
    const range = yAxisMax - yAxisMin;
    const normalized = (value - yAxisMin) / range;
    return chartHeight - (normalized * chartHeight);
  };
  
  const avgY = getYPosition(averagePrice);
  const minY = getYPosition(minPrice);
  const maxY = getYPosition(maxPrice);
  
  svg += `<line x1="0" y1="${avgY}" x2="${chartWidth}" y2="${avgY}" class="avg-line" />`;
  svg += `<line x1="0" y1="${minY}" x2="${chartWidth}" y2="${minY}" class="min-line" />`;
  svg += `<line x1="0" y1="${maxY}" x2="${chartWidth}" y2="${maxY}" class="max-line" />`;
  
  // Draw data line if we have points
  if (pointsData.length > 0) {
    // Scale X values based on timestamps
    const timestamps = pointsData.map(p => new Date(p.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime;
    
    // Function to get X position
    const getXPosition = (timestamp: string) => {
      const time = new Date(timestamp).getTime();
      const normalized = (time - minTime) / timeRange;
      return normalized * chartWidth;
    };
    
    // Create path for line chart
    let path = `<path d="M`;
    
    // Build the path data
    pointsData.forEach((point, index) => {
      const x = getXPosition(point.timestamp);
      const y = getYPosition(point.close);
      
      if (index === 0) {
        path += `${x},${y}`;
      } else {
        path += ` L${x},${y}`;
      }
    });
    
    // Close the path and add styling
    path += `" class="data-line" />`;
    svg += path;
    
    // Add the special dot for the last point (X0)
    const lastPoint = pointsData[pointsData.length - 1];
    const lastX = getXPosition(lastPoint.timestamp);
    const lastY = getYPosition(lastPoint.close);
    
    svg += `<circle cx="${lastX}" cy="${lastY}" class="last-point" r="6" />`;
  } else {
    // If no points, add a message
    svg += `<text x="${chartWidth / 2}" y="${chartHeight / 2}" class="chart-title" text-anchor="middle">No data points available</text>`;
  }
  
  // Y-axis labels
  svg += `<text x="-${margin.left/2}" y="${chartHeight/2}" class="label" text-anchor="middle" transform="rotate(-90, -${margin.left/2}, ${chartHeight/2})">Price ($)</text>`;
  svg += `<text x="-10" y="${getYPosition(averagePrice)}" class="label" text-anchor="end">Avg: $${averagePrice.toFixed(2)}</text>`;
  svg += `<text x="-10" y="${getYPosition(minPrice)}" class="label" text-anchor="end">Min: $${minPrice.toFixed(2)}</text>`;
  svg += `<text x="-10" y="${getYPosition(maxPrice)}" class="label" text-anchor="end">Max: $${maxPrice.toFixed(2)}</text>`;
  
  // X-axis label
  svg += `<text x="${chartWidth/2}" y="${chartHeight + 30}" class="label" text-anchor="middle">Time</text>`;
  
  // Title and info
  svg += `<text x="0" y="-5" class="chart-title">Segment: ${segmentId}</text>`;
  svg += `<text x="${chartWidth}" y="-5" class="label" text-anchor="end">Points: ${pointsData.length}</text>`;
  
  // Close the chart area group
  svg += `</g>`;
  
  // Close SVG
  svg += `</svg>`;
  
  return svg;
}