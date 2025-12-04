/**
 * API Route: Get ML Models
 * ========================
 * 
 * Endpoint pour récupérer la liste des modèles ML uniques utilisés
 * Accepte un paramètre query "type" pour filtrer par "simple" ou "directe"
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // "simple" ou "directe"
    
    const models = await DatabaseService.getUniqueMlModelNames();
    
    // Si un type est spécifié, filtrer les modèles qui contiennent ce type dans leur nom
    // Format attendu: "simple_model.json" ou "directe_model.json"
    let filteredModels = models;
    if (type === 'simple' || type === 'directe') {
      filteredModels = models.filter(model => 
        model.toLowerCase().includes(type.toLowerCase()) || 
        model.startsWith(`${type}_`) ||
        model.includes(`/${type}/`)
      );
    }
    
    return NextResponse.json({
      success: true,
      models: filteredModels
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des modèles ML:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des modèles',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

