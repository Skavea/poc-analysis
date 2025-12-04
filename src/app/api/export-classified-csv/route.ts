/**
 * API Route: Export Classified CSV
 * =================================
 * 
 * Endpoint pour exporter les données classées au format CSV
 * Format: CSV classique avec une ligne d'en-tête et une ligne par segment
 * Colonnes: "ID","R/V","UP/DOWN","u", "Time","Red","Green","Next","Result"
 * - ID: identifiant du segment
 * - R/V: 0 si R, 1 si V
 * - UP/DOWN: 0 si DOWN, 1 si UP
 * - u: valeur de u
 * - Time: heure de fin au format HH:MM (heure française)
 * - Red: red_points_formatted
 * - Green: green_points_formatted
 * - Next: prix des 30 prochains points (x0 en premier, suivi des 30 prochains prix séparés par des espaces)
 * - Result: vide
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { AnalysisResult } from '@/lib/schema';

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
 * Échappe une valeur pour le format CSV
 * @param value Valeur à échapper
 * @returns Valeur échappée pour CSV
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value == null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // Si la valeur contient des guillemets, des virgules ou des retours à la ligne, l'entourer de guillemets
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    // Échapper les guillemets en les doublant
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Génère le contenu CSV à partir des résultats classés
 * @param results Résultats classés avec les informations nécessaires
 * @param next30PointsMap Map des 30 prochains points par segment ID
 */
function generateCSVContent(
  results: AnalysisResult[],
  next30PointsMap: Map<string, number[]>
): string {
  const lines: string[] = [];
  
  // Ligne d'en-tête
  lines.push('"ID","R/V","UP/DOWN","u","Time","Red","Green","Next","Result"');

  for (const result of results) {
    // Calculer les valeurs R/V et UP/DOWN
    // R/V = 0 si R, 1 si V
    const rv = result.schemaType === 'R' ? 0 : 1;
    
    // UP/DOWN = 0 si DOWN, 1 si UP
    const upDown = result.trendDirection === 'DOWN' ? 0 : 1;
    
    // u = valeur de u (ou 0 si null)
    const u = result.u ?? 0;
    
    // Formater l'heure de fin du segment en format français HH:MM
    const time = formatFrenchTime(result.segmentEnd);
    
    // ID du segment
    const id = result.id;
    
    // Red: red_points_formatted (ou vide si null)
    const red = result.redPointsFormatted ?? '';
    
    // Green: green_points_formatted (ou vide si null)
    const green = result.greenPointsFormatted ?? '';
    
    // Next: prix des 30 prochains points (x0 en premier, suivi des 30 prochains prix)
    const next30Points = next30PointsMap.get(result.id) || [];
    // x0 est de type decimal (string) dans Drizzle, donc on doit le convertir en number
    const x0Value = typeof result.x0 === 'string' ? parseFloat(result.x0) : Number(result.x0);
    
    let next = '';
    
    // Vérifier que x0Value est valide (pas NaN, undefined ou null)
    if (isNaN(x0Value) || x0Value === null || x0Value === undefined) {
      console.warn(`Valeur x0 invalide pour le segment ${result.id}: ${result.x0}`);
      // Utiliser 0 comme valeur par défaut si x0 est invalide
      const defaultX0 = 0;
      const allPrices = [defaultX0, ...next30Points.filter(p => p != null && !isNaN(p))];
      next = allPrices
        .map(price => (price || 0).toFixed(6))
        .join(' ');
    } else {
      // Formater les prix : x0 suivi des 30 prochains prix, tous séparés par des espaces
      // Normaliser les valeurs zéro à 0.0 pour la cohérence
      const normalizeZeroValue = (value: number): number => {
        // Vérifier que la valeur est valide avant de la normaliser
        if (value == null || isNaN(value)) {
          return 0;
        }
        return Math.abs(value) < 1e-10 ? 0 : value;
      };
      
      // Filtrer les valeurs invalides et normaliser
      const validNextPoints = next30Points
        .filter(p => p != null && !isNaN(p))
        .map(normalizeZeroValue);
      
      const allPrices = [
        normalizeZeroValue(x0Value),
        ...validNextPoints
      ];
      
      // Formater chaque prix avec 6 décimales
      next = allPrices
        .map(price => {
          // Double vérification pour éviter les erreurs
          const validPrice = price != null && !isNaN(price) ? price : 0;
          return validPrice.toFixed(6);
        })
        .join(' ');
    }
    
    // Result: vide
    const resultValue = '';
    
    // Construire la ligne CSV avec les valeurs échappées
    const csvLine = [
      escapeCSVValue(id),
      escapeCSVValue(rv),
      escapeCSVValue(upDown),
      escapeCSVValue(u),
      escapeCSVValue(time),
      escapeCSVValue(red),
      escapeCSVValue(green),
      escapeCSVValue(next),
      escapeCSVValue(resultValue)
    ].join(',');
    
    lines.push(csvLine);
  }

  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres depuis l'URL
    const { searchParams } = new URL(request.url);
    const mlModelName = searchParams.get('ml_model_name');
    const modelType = searchParams.get('model_type'); // "simple" ou "directe"

    // Récupérer tous les résultats classés
    let classifiedResults = await DatabaseService.getClassifiedAnalysisResults();

    // Filtrer par ml_model_name si fourni
    if (mlModelName) {
      classifiedResults = classifiedResults.filter(
        result => result.mlModelName === mlModelName
      );
    }
    
    // Filtrer par model_type si fourni (les modèles doivent contenir le type dans leur nom)
    if (modelType) {
      classifiedResults = classifiedResults.filter(
        result => {
          if (!result.mlModelName) return false;
          const modelName = result.mlModelName.toLowerCase();
          return modelName.includes(modelType.toLowerCase()) || 
                 modelName.includes(`/${modelType}/`) ||
                 modelName.startsWith(`${modelType}_`);
        }
      );
    }

    if (classifiedResults.length === 0) {
      const message = mlModelName 
        ? `Aucune donnée classée trouvée pour le modèle "${mlModelName}"`
        : 'Aucune donnée classée trouvée';
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    // Récupérer les 30 prochains points pour chaque segment
    // Créer une map pour stocker les résultats par segment ID
    const next30PointsMap = new Map<string, number[]>();

    // Parcourir tous les segments et récupérer les 30 prochains points
    for (const result of classifiedResults) {
      try {
        const next30Points = await DatabaseService.getNext30Points(
          result.symbol,
          result.segmentEnd,
          result.date
        );
        next30PointsMap.set(result.id, next30Points);
      } catch (error) {
        console.error(`Erreur lors de la récupération des 30 prochains points pour le segment ${result.id}:`, error);
        // En cas d'erreur, utiliser un tableau vide
        next30PointsMap.set(result.id, []);
      }
    }

    // Générer le contenu CSV avec les 30 prochains points
    const csvContent = generateCSVContent(classifiedResults, next30PointsMap);

    // Générer le nom de fichier avec le modèle si spécifié
    const modelSuffix = mlModelName 
      ? `-${mlModelName.replace(/\.json$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')}`
      : '';
    const filename = `classified-data${modelSuffix}-${new Date().toISOString().split('T')[0]}.csv`;

    // Créer la réponse avec le contenu CSV
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
