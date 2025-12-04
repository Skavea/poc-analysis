/**
 * API Route: Upload Market Data
 * ============================
 * 
 * Endpoint pour uploader et traiter les fichiers de données de marché
 * Format attendu: NOMACTIF_YYYY-MM-DD.txt
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { StockAnalysisService } from '@/lib/stockAnalysisService';

// Configuration de la base de données
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(databaseUrl);

/**
 * Parse le fichier de données de marché au format tabulé
 * Format attendu: date	ouv	haut	bas	clot	vol	devise
 */
function parseMarketDataFile(content: string): { data: Record<string, any>, symbol: string, date: string } {
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('Fichier vide ou format invalide');
  }

  // Vérifier l'en-tête
  const header = lines[0].toLowerCase();
  const expectedColumns = ['date', 'ouv', 'haut', 'bas', 'clot', 'vol', 'devise'];
  const hasValidHeader = expectedColumns.every(col => header.includes(col));
  
  if (!hasValidHeader) {
    throw new Error(`En-tête invalide. Attendu: ${expectedColumns.join('\t')}`);
  }

  // Parser les données
  const data: Record<string, any> = {};
  let validLines = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length < 6) continue;

    const [dateStr, open, high, low, close, volume, currency] = parts;
    
    // Parser la date (format: 21/10/2025 09:00)
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hour, minute] = timePart.split(':');
    
    // Créer un timestamp ISO
    const timestamp = new Date(
      parseInt(year), 
      parseInt(month) - 1, 
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute)
    ).toISOString();

    // Stocker les données avec le timestamp comme clé
    data[timestamp] = {
      '1. open': parseFloat(open),
      '2. high': parseFloat(high),
      '3. low': parseFloat(low),
      '4. close': parseFloat(close),
      '5. volume': parseInt(volume) || 0
    };

    validLines++;
  }

  if (validLines === 0) {
    throw new Error('Aucune donnée valide trouvée dans le fichier');
  }

  return { data, symbol: '', date: '' };
}

/**
 * Valide la continuité temporelle des données intraday
 * Vérifie que chaque point est exactement 1 minute après le précédent
 * Autorise les changements de jour (on reprend à partir du nouveau jour)
 * Rejette les gaps dans la même journée
 */
function validateTemporalContinuity(data: Record<string, any>): { valid: boolean; error?: string } {
  const timestamps = Object.keys(data).sort();
  
  if (timestamps.length < 2) {
    // Pas assez de points pour valider la continuité
    return { valid: true };
  }

  for (let i = 1; i < timestamps.length; i++) {
    const prevTimestamp = new Date(timestamps[i - 1]);
    const currentTimestamp = new Date(timestamps[i]);
    
    // Calculer la différence en millisecondes
    const diffMs = currentTimestamp.getTime() - prevTimestamp.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // Vérifier si le timestamp actuel est avant ou égal au précédent (données dupliquées ou mal ordonnées)
    if (diffMinutes <= 0) {
      const prevTimeStr = prevTimestamp.toISOString().replace('T', ' ').substring(0, 19);
      const currentTimeStr = currentTimestamp.toISOString().replace('T', ' ').substring(0, 19);
      return {
        valid: false,
        error: `Données temporelles invalides : le point à ${currentTimeStr} est antérieur ou égal au point précédent (${prevTimeStr}).\n\nLes données doivent être ordonnées chronologiquement avec un intervalle d'exactement 1 minute entre chaque point.`
      };
    }
    
    // Vérifier si c'est exactement 1 minute après
    if (diffMinutes === 1) {
      // Continuité parfaite, on continue
      continue;
    }
    
    // Si ce n'est pas 1 minute après, vérifier si c'est le jour suivant
    const prevDate = prevTimestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentDate = currentTimestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (prevDate !== currentDate) {
      // C'est le jour suivant, c'est OK, on reprend à partir de ce point
      continue;
    }
    
    // Même jour mais pas 1 minute après → ERREUR
    const prevTimeStr = prevTimestamp.toISOString().replace('T', ' ').substring(0, 19);
    const currentTimeStr = currentTimestamp.toISOString().replace('T', ' ').substring(0, 19);
    return {
      valid: false,
      error: `Gap temporel détecté dans les données intraday.\n\nLe point à ${currentTimeStr} n'est pas exactement 1 minute après le point précédent (${prevTimeStr}).\n\nLes données intraday doivent être continues avec un intervalle d'exactement 1 minute entre chaque point. Les changements de jour sont autorisés, mais les gaps dans la même journée ne sont pas acceptés.`
    };
  }

  return { valid: true };
}

/**
 * Extraire le symbole et la date du nom de fichier
 * Format: NOMACTIF_YYYY-MM-DD.txt
 */
function extractSymbolAndDate(filename: string): { symbol: string, date: string } {
  // Nettoyer le nom de fichier : supprimer extension, espaces, parenthèses, etc.
  let nameWithoutExt = filename.replace(/\.txt$/i, ''); // Supprimer .txt (insensible à la casse)
  nameWithoutExt = nameWithoutExt.replace(/\s*\([^)]*\)/g, ''); // Supprimer (1), (2), etc.
  nameWithoutExt = nameWithoutExt.trim(); // Supprimer espaces en début/fin
  
  const parts = nameWithoutExt.split('_');
  
  if (parts.length < 2) {
    throw new Error(`Format de nom de fichier invalide. Attendu: NOMACTIF_YYYY-MM-DD.txt. Reçu: ${filename}`);
  }

  const symbol = parts[0].toUpperCase();
  const dateStr = parts[1];

  // Valider le format de date
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new Error(`Format de date invalide. Attendu: YYYY-MM-DD. Reçu: ${dateStr} dans le fichier: ${filename}`);
  }

  console.log(`📁 Fichier analysé: ${filename} -> Symbole: ${symbol}, Date: ${dateStr}`);
  return { symbol, date: dateStr };
}

export async function POST(request: NextRequest) {
  try {
    // Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier l'extension
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: 'Format de fichier non supporté. Seuls les fichiers .txt sont acceptés.' },
        { status: 400 }
      );
    }

    // Lire le contenu du fichier
    const content = await file.text();
    
    // Extraire le symbole et la date du nom de fichier
    const { symbol, date } = extractSymbolAndDate(file.name);
    
    // Parser les données du fichier
    const { data } = parseMarketDataFile(content);
    
    // VALIDATION : Vérifier la continuité temporelle AVANT toute sauvegarde
    const validation = validateTemporalContinuity(data);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Erreur de validation des données',
          message: validation.error || 'Les données ne respectent pas la continuité temporelle requise'
        },
        { status: 400 }
      );
    }
    
    const totalPoints = Object.keys(data).length;
    const id = `${symbol}_${date}`;

    console.log(`📊 Upload de données pour ${symbol} - ${date} (${totalPoints} points)`);

    // Sauvegarder en base de données
    await sql`
      INSERT INTO stock_data (id, symbol, date, data, total_points, market_type)
      VALUES (${id}, ${symbol}, ${date}, ${JSON.stringify(data)}, ${totalPoints}, 'STOCK')
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        total_points = EXCLUDED.total_points,
        created_at = CURRENT_TIMESTAMP
    `;

    console.log(`✅ Données sauvegardées pour ${symbol} - ${date}`);

    // Vérifier si une analyse existe déjà pour ce symbole
    const existingAnalysis = await sql`
      SELECT COUNT(*) as count FROM analysis_results 
      WHERE symbol = ${symbol}
    `;

    let segmentsCreated = 0;
    let analysisMessage = '';

    if (existingAnalysis[0].count > 0) {
      analysisMessage = `Analyse déjà existante pour ${symbol} (${existingAnalysis[0].count} segments).`;
      console.log(`⚠️ ${analysisMessage}`);
    } else {
      try {
        // Lancer l'analyse automatique des segments
        console.log(`🔍 Lancement de l'analyse des segments pour ${symbol}...`);
        const service = StockAnalysisService.getInstance();
        const segments = service.extractSegments(symbol, data);
        
        if (segments.length > 0) {
          await service.saveAnalysisResults(segments, id);
          segmentsCreated = segments.length;
          analysisMessage = `${segments.length} segments créés avec succès.`;
          console.log(`✅ ${analysisMessage}`);
        } else {
          analysisMessage = 'Aucun segment détecté dans les données.';
          console.log(`⚠️ ${analysisMessage}`);
        }
      } catch (analysisError) {
        console.error('Erreur lors de l\'analyse:', analysisError);
        analysisMessage = 'Erreur lors de l\'analyse des segments.';
      }
    }

    return NextResponse.json({
      success: true,
      message: `Données de marché ${symbol} (${date}) uploadées avec succès ! ${totalPoints} points traités. ${analysisMessage}`,
      data: {
        symbol,
        date,
        totalPoints,
        id,
        segmentsCreated
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload du fichier:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return NextResponse.json(
      { 
        error: 'Erreur lors du traitement du fichier',
        message: errorMessage 
      },
      { status: 400 }
    );
  }
}
