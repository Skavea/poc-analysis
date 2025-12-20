/**
 * Page: Manual Segment Creation
 * =============================
 * 
 * Formulaire pour créer des segments manuellement
 */

import { DatabaseService } from '@/lib/db';
import Navigation from '@/components/layout/Navigation';
import ManualSegmentForm from '@/components/ManualSegmentForm';

interface PageProps {
  params: Promise<{ stockDataId: string }>;
}

export default async function ManualSegmentPage({ params }: PageProps) {
  const { stockDataId } = await params;
  
  // Récupérer les données du marché
  const stockData = await DatabaseService.getStockDataById(stockDataId);
  
  if (!stockData) {
    return (
      <Navigation
        pageTitle="Erreur"
        pageSubtitle="Données de marché non trouvées"
      >
        <div>Les données de marché demandées n'ont pas été trouvées.</div>
      </Navigation>
    );
  }

  // Récupérer les segments existants pour ce stock_data
  // Retourne un tableau vide en cas d'erreur de connexion pour permettre l'affichage de la page
  const existingSegments = await DatabaseService.getAnalysisResultsByStockDataId(stockDataId);
  
  // Calculer les statistiques
  const totalPoints = stockData.totalPoints;
  const processedPoints = existingSegments.reduce((sum, seg) => sum + seg.pointCount, 0);
  const segmentsCount = existingSegments.length;
  
  // Calculer la plage de dates
  const data = stockData.data as Record<string, unknown>;
  const timestamps = Object.keys(data).sort();
  const firstDate = timestamps[0] ? new Date(timestamps[0]).toISOString() : '';
  const lastDate = timestamps[timestamps.length - 1] ? new Date(timestamps[timestamps.length - 1]).toISOString() : '';

  return (
    <Navigation
      pageTitle="Création Manuelle de Segments"
      pageSubtitle={`Marché: ${stockData.symbol}`}
    >
      <ManualSegmentForm
        stockDataId={stockDataId}
        symbol={stockData.symbol}
        date={stockData.date}
        data={data}
        firstDate={firstDate}
        lastDate={lastDate}
        totalPoints={totalPoints}
        processedPoints={processedPoints}
        segmentsCount={segmentsCount}
        existingSegments={existingSegments}
      />
    </Navigation>
  );
}

