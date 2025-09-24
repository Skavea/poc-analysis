/**
 * API Route: Run Analysis
 * =======================
 * 
 * Endpoint to run analysis on existing stock data
 */

import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisService } from '@/lib/stockAnalysisService';
import { DatabaseService } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Check if analysis already exists for this symbol
    const { neon } = await import('@neondatabase/serverless');
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const sql = neon(databaseUrl);
    
    const existingAnalysis = await sql`
      SELECT COUNT(*) as count FROM analysis_results 
      WHERE symbol = ${symbol.toUpperCase()}
    `;

    if (existingAnalysis[0].count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Analysis already exists for ${symbol}. Found ${existingAnalysis[0].count} existing segments.`,
          segmentsCreated: 0
        },
        { status: 409 } // Conflict status
      );
    }

    // Get existing stock data
    const stockData = await sql`
      SELECT data FROM stock_data 
      WHERE symbol = ${symbol.toUpperCase()}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!stockData[0]) {
      return NextResponse.json(
        { error: 'No stock data found for symbol' },
        { status: 404 }
      );
    }

    // Run analysis on existing data
    const service = StockAnalysisService.getInstance();
    const segments = service.extractSegments(symbol, stockData[0].data);
    
    // Save analysis results
    await service.saveAnalysisResults(segments);

    return NextResponse.json({
      success: true,
      message: `Analysis completed for ${symbol}`,
      segmentsCreated: segments.length
    });
  } catch (error) {
    console.error('Error running analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
