/**
 * Server Component: Result Stats
 * ===============================
 * 
 * Affiche les statistiques de résultats pour un symbole ou un stock_data_id
 */

import { DatabaseService } from '@/lib/db';
import ResultStatsClient from './ResultStatsClient';

interface ResultStatsProps {
  symbol?: string;
  stockDataId?: string;
}

export default async function ResultStats({ symbol, stockDataId }: ResultStatsProps) {
  // Récupérer les stats pour les deux seuils
  const [resultStats09, resultStats06, predictionStats] = await Promise.all([
    DatabaseService.getResultStats(0.9, symbol, stockDataId),
    DatabaseService.getResultStats(0.6, symbol, stockDataId),
    DatabaseService.getPredictionStats(symbol, stockDataId),
  ]);

  return (
    <ResultStatsClient 
      resultStats09={resultStats09}
      resultStats06={resultStats06}
      predictionStats={predictionStats}
    />
  );
}

