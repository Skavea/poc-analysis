/**
 * Regenerate Segments From Stored Streams
 * ======================================
 *
 * Script qui relance l'analyse pour tous les streams stockés dans `stock_data`
 * en appliquant la logique actuelle de `StockAnalysisService`.
 */

import { StockAnalysisService } from '../src/lib/stockAnalysisService';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement depuis .env.local en priorité
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = dotenv.parse(envContent);

  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
} else {
  // Fallback sur le chargement standard si .env.local absent
  dotenv.config();
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function regenerateSegmentsFromStockData() {
  const analysisService = new StockAnalysisService();

  try {
    console.log('🔍 Récupération des streams enregistrés dans `stock_data`...');

    const streams = await sql`
      SELECT id, symbol, data
      FROM stock_data
      ORDER BY created_at ASC
    `;

    if (streams.length === 0) {
      console.log('Aucun stream à retraiter.');
      return;
    }

    console.log(`✅ ${streams.length} stream(s) trouvé(s).`);

    for (const stream of streams) {
      const { id, symbol } = stream;
      const rawData = stream.data;
      const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      console.log(`\n🔄 Régénération des segments pour ${symbol} (stock_data.id=${id})...`);

      const segments = analysisService.extractSegments(symbol, parsedData);
      console.log(`➡️ ${segments.length} segment(s) calculé(s), sauvegarde en base...`);

      const savedCount = await analysisService.saveAnalysisResults(segments, id);

      console.log(`✅ ${savedCount} segment(s) sauvegardé(s) pour ${symbol} (stock_data.id=${id}).`);
    }

    console.log('\n🎉 Régénération terminée pour l’ensemble des streams.');
  } catch (error) {
    console.error('❌ Erreur lors de la régénération des segments :', error);
    process.exit(1);
  }
}

regenerateSegmentsFromStockData();

