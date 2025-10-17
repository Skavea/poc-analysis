/**
 * API Route: Process Stock
 * ========================
 * 
 * Endpoint to add a new stock and run analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { StockAnalysisService } from '@/lib/stockAnalysisService';
import { MultiMarketAnalysisService } from '@/lib/multiMarketAnalysisService';

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

    // Détecter le type de marché et utiliser le bon service
    let result;
    
    if (symbol.endsWith('.PA')) {
      // Actions françaises : utiliser MultiMarketAnalysisService
      console.log(`🇫🇷 Traitement d'une action française: ${symbol}`);
      const multiService = new MultiMarketAnalysisService();
      const multiResult = await multiService.processMarketAsset(symbol, 'STOCK');
      result = {
        success: multiResult.success,
        message: multiResult.message,
        segmentsCreated: multiResult.segmentsCreated
      };
    } else if (symbol === 'BTC' || symbol === 'ETH') {
      // Cryptomonnaies : utiliser MultiMarketAnalysisService
      console.log(`₿ Traitement d'une cryptomonnaie: ${symbol}`);
      const multiService = new MultiMarketAnalysisService();
      const multiResult = await multiService.processMarketAsset(symbol, 'CRYPTOCURRENCY');
      result = {
        success: multiResult.success,
        message: multiResult.message,
        segmentsCreated: multiResult.segmentsCreated
      };
    } else {
      // Actions américaines : utiliser StockAnalysisService
      console.log(`🇺🇸 Traitement d'une action américaine: ${symbol}`);
      const service = StockAnalysisService.getInstance();
      result = await service.processStock(symbol);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing stock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
