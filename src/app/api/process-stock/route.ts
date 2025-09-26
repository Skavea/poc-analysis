/**
 * API Route: Process Stock
 * ========================
 * 
 * Endpoint to add a new stock and run analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisService } from '@/lib/stockAnalysisService';

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Check if stock already exists
    const { neon } = await import('@neondatabase/serverless');
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_yEFj57ApYTDl@ep-green-base-agls4wca-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    const sql = neon(databaseUrl);

    const existingStock = await sql`
      SELECT COUNT(*) as count FROM stock_data 
      WHERE symbol = ${symbol.toUpperCase()}
    `;

    if (existingStock[0].count > 0) {
      return NextResponse.json({
        success: false,
        message: `Stock ${symbol} already exists in the database.`,
        segmentsCreated: 0
      });
    }

    const service = StockAnalysisService.getInstance();
    const result = await service.processStock(symbol);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
