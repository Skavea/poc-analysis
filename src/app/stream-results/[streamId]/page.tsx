/**
 * Stream Results Page
 * ===================
 * 
 * Page de consultation des résultats pour un stream terminé en mode manuel
 * Affiche deux graphiques : tous les points et les résultats des segments
 */

import { DatabaseService } from '@/lib/db';
import Navigation from '@/components/layout/Navigation';
import StreamResultsClient from '@/components/StreamResultsClient';
import ResultStats from '@/components/ResultStats';
import { 
  Card,
  Heading, 
  Text, 
  Box,
  Button,
  HStack,
  VStack
} from '@chakra-ui/react';
import { Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface StreamResultsPageProps {
  params: Promise<{ streamId: string }>;
}

async function StreamResultsServer({ streamId }: { streamId: string }) {
  try {
    // Récupérer les données du stream
    const stockData = await DatabaseService.getStockDataById(streamId);
    if (!stockData) {
      return (
        <Card.Root>
          <Card.Body textAlign="center" py={12}>
            <Box mb={4}>
              <Database size={48} color="red" />
            </Box>
            <Heading size="md" color="fg.default" mb={2}>
              Stream introuvable
            </Heading>
            <Text color="fg.muted">
              Le stream avec l'ID {streamId} n'existe pas.
            </Text>
          </Card.Body>
        </Card.Root>
      );
    }

    // Vérifier que le stream est terminé et en mode manuel
    if (!stockData.terminated || stockData.generationMode !== 'manual') {
      return (
        <Card.Root>
          <Card.Body textAlign="center" py={12}>
            <Box mb={4}>
              <Database size={48} color="orange" />
            </Box>
            <Heading size="md" color="fg.default" mb={2}>
              Stream non disponible
            </Heading>
            <Text color="fg.muted">
              Cette page est uniquement disponible pour les streams terminés en mode manuel.
            </Text>
          </Card.Body>
        </Card.Root>
      );
    }

    // Récupérer les segments du stream (triés par segment_end croissant pour avoir l'ordre chronologique)
    const segments = await DatabaseService.getAnalysisResultsByStockDataId(streamId);
    
    // Trier par segment_end croissant (le plus vieux en premier)
    const sortedSegments = [...segments].sort((a, b) => {
      const dateA = new Date(a.segmentEnd).getTime();
      const dateB = new Date(b.segmentEnd).getTime();
      return dateA - dateB;
    });

    // Récupérer les stats pour les passer au composant client
    const [predictionStats, resultStats06] = await Promise.all([
      DatabaseService.getPredictionStats(undefined, streamId),
      DatabaseService.getResultStats(0.6, undefined, streamId),
    ]);

    return (
      <VStack gap={6} align="stretch">
        {/* Afficher les stats de résultats pour ce stream (déjà vérifié qu'il est en mode manuel) */}
        <Card.Root>
          <Card.Header>
            <Heading size="md" color="fg.default">Statistiques de résultats</Heading>
          </Card.Header>
          <Card.Body>
            <ResultStats stockDataId={streamId} />
          </Card.Body>
        </Card.Root>

        <StreamResultsClient 
          stockData={stockData} 
          segments={sortedSegments}
          predictionStats={predictionStats}
          resultStats06={resultStats06}
        />
      </VStack>
    );
  } catch (error) {
    console.error('Error fetching stream results:', error);
    return (
      <Card.Root>
        <Card.Body textAlign="center" py={12}>
          <Box mb={4}>
            <Database size={48} color="red" />
          </Box>
          <Heading size="md" color="fg.default" mb={2}>
            Erreur lors du chargement
          </Heading>
          <Text color="fg.muted">
            Impossible de charger les résultats du stream. Veuillez réessayer.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }
}

export default async function StreamResultsPage({ params }: StreamResultsPageProps) {
  const resolvedParams = await params;
  const streamId = resolvedParams.streamId;

  // Récupérer les données du stream pour obtenir le symbole
  let symbol: string | undefined;
  try {
    const stockData = await DatabaseService.getStockDataById(streamId);
    symbol = stockData?.symbol;
  } catch (error) {
    console.error('Error fetching stock data for breadcrumb:', error);
  }

  return (
    <Navigation
      breadcrumbs={[
        ...(symbol ? [{ label: symbol, href: `/streams/${symbol}` }] : []),
        { label: 'Résultats du stream' }
      ]}
      pageTitle="Consultation des résultats"
      pageSubtitle="Visualisation des résultats des segments"
      pageActions={
        <HStack gap={2}>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: '8px' }} />
              Retour
            </Link>
          </Button>
        </HStack>
      }
    >
      <StreamResultsServer streamId={streamId} />
    </Navigation>
  );
}

