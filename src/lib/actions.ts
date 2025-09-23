/**
 * Server Actions
 * ==============
 * 
 * Server-side actions for data mutations
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DatabaseService } from './db';
import { StockAnalysisService } from './stockAnalysisService';

export async function addStockAction(formData: FormData) {
  const symbol = formData.get('symbol') as string;
  
  if (!symbol) {
    return { error: 'Symbol is required' };
  }

  try {
    const analysisService = new StockAnalysisService();
    const result = await analysisService.processStock(symbol);
    
    if (!result.success) {
      return { error: result.message };
    }
    
    revalidatePath('/');
    return { success: true, symbol, segmentsCreated: result.segmentsCreated };
  } catch (error) {
    console.error('Error adding stock:', error);
    return { error: 'Failed to add stock' };
  }
}

export async function runAnalysisAction(symbol: string) {
  try {
    // Check if stock data exists
    const existingStock = await DatabaseService.getStockData(symbol, new Date().toISOString().split('T')[0]);
    
    if (!existingStock) {
      return { error: 'Stock data not found. Please add the stock first.' };
    }

    const analysisService = new StockAnalysisService();
    
    // Extract segments from existing data
    const segments = analysisService.extractSegments(symbol, existingStock.data);
    
    if (segments.length === 0) {
      return { error: 'No segments could be extracted from the data' };
    }
    
    // Save analysis results
    await analysisService.saveAnalysisResults(segments);
    
    revalidatePath(`/analysis/${symbol}`);
    return { success: true, segmentsCreated: segments.length };
  } catch (error) {
    console.error('Error running analysis:', error);
    return { error: 'Failed to run analysis' };
  }
}

export async function updateSchemaAction(segmentId: string, schemaType: 'R' | 'V' | 'UNCLASSIFIED') {
  try {
    await DatabaseService.updateAnalysisSchema(segmentId, schemaType);
    
    revalidatePath(`/segment/${encodeURIComponent(segmentId)}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating schema:', error);
    return { error: 'Failed to update schema' };
  }
}

export async function deleteStockAction(symbol: string) {
  try {
    // Note: This would need to be implemented in DatabaseService
    // await DatabaseService.deleteStock(symbol);
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting stock:', error);
    return { error: 'Failed to delete stock' };
  }
}
