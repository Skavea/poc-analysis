/**
 * API Route: Get Archived ML Models
 * =================================
 * 
 * Endpoint pour récupérer la liste des modèles archivés dans data/archives
 * Accepte un paramètre query "type" pour filtrer par "simple" ou "directe"
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // "simple" ou "directe"
    
    const archivesDir = path.join(process.cwd(), 'data', 'archives');
    
    // Si un type est spécifié, chercher dans le sous-dossier correspondant
    const targetDir = type 
      ? path.join(archivesDir, type)
      : archivesDir;
    
    // Lire le contenu du dossier
    const files = await fs.readdir(targetDir);
    
    // Filtrer uniquement les fichiers JSON
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .sort();
    
    return NextResponse.json({
      success: true,
      models: jsonFiles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des modèles archivés:', error);
    
    // Si le dossier n'existe pas, retourner une liste vide
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({
        success: true,
        models: []
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des modèles archivés',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

