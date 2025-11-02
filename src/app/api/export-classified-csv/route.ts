/**
 * API Route: Export Classified CSV
 * =================================
 * 
 * Endpoint pour exporter les données classées au format CSV
 * Format: 4 lignes par entrée classée
 * - Ligne 1: "<a> <b> <c> <id> <heure_fin>" où a=0 si R, 1 si V; b=0 si DOWN, 1 si UP; c=valeur de u; id=identifiant du segment; heure_fin=heure de fin au format HH:MM (heure française)
 * - Ligne 2: red_points_formatted
 * - Ligne 3: green_points_formatted
 * - Ligne 4: vide
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';

/**
 * Formate l'heure de fin du segment en format français HH:MM
 * Utilise le fuseau horaire français (Europe/Paris)
 */
function formatFrenchTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Formater la date en utilisant le fuseau horaire français (Europe/Paris)
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(dateObj);
}

/**
 * Génère le contenu CSV à partir des résultats classés
 */
function generateCSVContent(results: Array<{
  id: string;
  schemaType: string;
  trendDirection: string;
  u: number | null;
  redPointsFormatted: string | null;
  greenPointsFormatted: string | null;
  segmentEnd: Date | string;
}>): string {
  const lines: string[] = [];

  for (const result of results) {
    // Calculer les valeurs a, b, c
    // a = 0 si R, 1 si V
    const a = result.schemaType === 'R' ? 0 : 1;
    
    // b = 0 si DOWN, 1 si UP
    const b = result.trendDirection === 'DOWN' ? 0 : 1;
    
    // c = valeur de u (ou 0 si null)
    const c = result.u ?? 0;
    
    // Formater l'heure de fin du segment en format français HH:MM
    const endTime = formatFrenchTime(result.segmentEnd);
    
    // Ligne 1: "<a> <b> <c> <id> <heure_fin>" avec l'ID du segment et l'heure de fin
    lines.push(`${a} ${b} ${c} ${result.id} ${endTime}`);
    
    // Ligne 2: red_points_formatted (ou vide si null)
    lines.push(result.redPointsFormatted ?? '');
    
    // Ligne 3: green_points_formatted (ou vide si null)
    lines.push(result.greenPointsFormatted ?? '');
    
    // Ligne 4: vide
    lines.push('');
  }

  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer tous les résultats classés
    const classifiedResults = await DatabaseService.getClassifiedAnalysisResults();

    if (classifiedResults.length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée classée trouvée' },
        { status: 404 }
      );
    }

    // Générer le contenu CSV
    const csvContent = generateCSVContent(classifiedResults);

    // Créer la réponse avec le contenu CSV
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="classified-data-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

    return response;
  } catch (error) {
    console.error('Erreur lors de la génération du CSV:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du CSV', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
