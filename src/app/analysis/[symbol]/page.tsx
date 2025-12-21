/**
 * Page 2: Analysis Page
 * =====================
 * 
 * Lists all sub-datasets for a specific stock
 * Shows trend analysis (UP/DOWN) for each segment
 * Filter by R/V/UNCLASSIFIED schema types
 * Run analysis to create new segments
 * Click on any segment to view details
 */

import { use } from 'react';
import { DatabaseService } from '@/lib/db';
import { TrendingUp, TrendingDown, Clock, BarChart3, ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AnalysisStatusScript from '@/components/AnalysisStatusScript';
import ClientAnalysisStatus from '@/components/ClientAnalysisStatus';
import AdvancedAnalysisFilter from '@/components/AdvancedAnalysisFilter';
import DeleteSegmentButton from '@/components/DeleteSegmentButton';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Grid,
  GridItem,
  Badge,
  Heading,
  Flex,
} from "@chakra-ui/react";
import Navigation from '@/components/layout/Navigation';

interface AnalysisPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ 
    filter?: string;
    schema?: string | string[];
    pattern?: string | string[];
    mlClassed?: string | string[];
    mlResult?: string | string[];
    stream?: string;
  }>;
}

// Server component for analysis results with stats
async function AnalysisStatsServer({ 
  symbol, 
  searchParams,
  setHasExistingAnalysis 
}: { 
  symbol: string;
  searchParams: { 
    filter?: string;
    schema?: string | string[];
    pattern?: string | string[];
    mlClassed?: string | string[];
    mlResult?: string | string[];
    stream?: string;
  };
  setHasExistingAnalysis?: (value: boolean) => void;
}) {
  // Récupérer les segments selon le contexte
  const results = searchParams.stream 
    ? await DatabaseService.getAnalysisResultsByStreamId(searchParams.stream)
    : await DatabaseService.getAnalysisResults(symbol);
  
  // Vérifier si le stream est terminé et trouver le dernier segment créé
  let isStreamTerminated = true;
  let lastSegmentId: string | null = null;
  
  if (searchParams.stream) {
    const stream = await DatabaseService.getStockDataById(searchParams.stream);
    isStreamTerminated = stream?.terminated ?? true;
    
    // Trouver le dernier segment créé (created_at le plus récent) pour ce stream
    if (results.length > 0 && !isStreamTerminated) {
      const lastSegment = results.reduce((latest, current) => {
        const currentCreatedAt = new Date(current.createdAt).getTime();
        const latestCreatedAt = new Date(latest.createdAt).getTime();
        return currentCreatedAt > latestCreatedAt ? current : latest;
      });
      lastSegmentId = lastSegment.id;
    }
  }
  
  const rCount = results.filter(r => r.schemaType === 'R').length;
  const vCount = results.filter(r => r.schemaType === 'V').length;
  const unclassifiedCount = results.filter(r => r.schemaType === 'UNCLASSIFIED').length;
  
  // Comptage des patterns
  const patternYesCount = results.filter(r => r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== '').length;
  const patternNoCount = results.filter(r => r.patternPoint === null || r.patternPoint === '' || r.patternPoint === 'null').length;
  const patternUnclassifiedCount = results.filter(r => r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified').length;
  const mlClassedTrueCount = results.filter(r => r.mlClassed === true).length;
  const mlClassedFalseCount = results.length - mlClassedTrueCount;
  const mlResultTrueCount = results.filter(r => r.mlResult === 'TRUE').length;
  const mlResultFalseCount = results.filter(r => r.mlResult === 'FALSE').length;
  const mlResultUnclassifiedCount = results.filter(r => r.mlResult === 'UNCLASSIFIED').length;

  // Nombre correctement classifié: schema classifié OU pattern référencé
  const classifiedCount = results.filter(r => (
    r.schemaType !== 'UNCLASSIFIED' || (
      r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== ''
    )
  )).length;
  
  const hasExistingAnalysis = results.length > 0;
  
  // If setHasExistingAnalysis is provided, call it with the current status
  if (setHasExistingAnalysis) {
    setHasExistingAnalysis(hasExistingAnalysis);
  }

  // Filter results based on search params (normalize: treat undefined/empty/'all' as no filter)
  const normalizeFilters = (value: string | string[] | undefined) => {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    return arr.filter(v => v && v !== 'all');
  };

  const schemaFilters = normalizeFilters(searchParams.schema);
  const patternFilters = normalizeFilters(searchParams.pattern);
  const mlClassedFilters = normalizeFilters(searchParams.mlClassed);
  const mlResultFilters = normalizeFilters(searchParams.mlResult);
  
  let filteredResults = results;
  
  // Appliquer les filtres schema
  if (schemaFilters.length > 0) {
    filteredResults = filteredResults.filter(result => schemaFilters.includes(result.schemaType));
  }
  
  // Appliquer les filtres pattern
  if (patternFilters.length > 0) {
    filteredResults = filteredResults.filter(result => {
      if (patternFilters.includes('yes')) {
        return result.patternPoint && result.patternPoint !== 'UNCLASSIFIED' && result.patternPoint !== 'unclassified' && result.patternPoint !== 'null' && result.patternPoint !== '';
      }
      if (patternFilters.includes('no')) {
        return result.patternPoint === null || result.patternPoint === '' || result.patternPoint === 'null';
      }
      if (patternFilters.includes('unclassified')) {
        return result.patternPoint === 'UNCLASSIFIED' || result.patternPoint === 'unclassified';
      }
      return false;
    });
  }

  if (mlClassedFilters.length > 0) {
    filteredResults = filteredResults.filter(result => {
      const value = result.mlClassed ? 'true' : 'false';
      return mlClassedFilters.includes(value);
    });
  }

  if (mlResultFilters.length > 0) {
    filteredResults = filteredResults.filter(result => {
      const status = result.mlResult === 'TRUE'
        ? 'good'
        : result.mlResult === 'FALSE'
        ? 'wrong'
        : 'unclassified';
      return mlResultFilters.includes(status);
    });
  }

  return (
    <VStack gap={8} align="stretch">
      {/* Hidden script to update client components */}
      <AnalysisStatusScript hasExistingAnalysis={hasExistingAnalysis} />
      


      {/* Analysis Results et Filtres côte à côte */}
      <Card.Root>
        <Card.Header>
          <Heading size="lg" color="fg.default">
            Analysis Results
          </Heading>
        </Card.Header>
        <Card.Body>
          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
            {/* Encarts de statistiques */}
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
              {/* Encart Total et Classifiés */}
              <Card.Root>
                <Card.Header>
                  <Heading size="md" color="fg.default">Summary</Heading>
                </Card.Header>
                <Card.Body>
                  <VStack gap={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">Total:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="blue.600">{results.length}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">{symbol === 'AAPL' ? 'Classifiés:' : 'Classify:'}</Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">{classifiedCount}</Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Encart Schema Type */}
              <Card.Root>
                <Card.Header>
                  <Heading size="md" color="fg.default">Schema type:</Heading>
                </Card.Header>
                <Card.Body>
                  <VStack gap={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">R:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="red.600">{rCount}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">V:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="purple.600">{vCount}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">UNCLASSIFIED:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.600">{unclassifiedCount}</Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Encart Patterns */}
              <Card.Root>
                <Card.Header>
                  <Heading size="md" color="fg.default">Patterns:</Heading>
                </Card.Header>
                <Card.Body>
                  <VStack gap={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">Yes:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">{patternYesCount}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">No:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="red.600">{patternNoCount}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">UNCLASSIFIED:</Text>
                      <Text fontSize="lg" fontWeight="bold" color="gray.600">{patternUnclassifiedCount}</Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </Grid>

            {/* Filters on the right */}
            <Card.Root>
              <Card.Header>
                <Heading size="md" color="fg.default">Filters</Heading>
              </Card.Header>
              <Card.Body>
                <AdvancedAnalysisFilter 
                  totalCount={results.length}
                  rCount={rCount}
                  vCount={vCount}
                  unclassifiedCount={unclassifiedCount}
                  patternYesCount={patternYesCount}
                  patternNoCount={patternNoCount}
                  patternUnclassifiedCount={patternUnclassifiedCount}
                  mlClassedTrueCount={mlClassedTrueCount}
                  mlClassedFalseCount={mlClassedFalseCount}
                  mlResultUnclassifiedCount={mlResultUnclassifiedCount}
                  mlResultTrueCount={mlResultTrueCount}
                  mlResultFalseCount={mlResultFalseCount}
                />
              </Card.Body>
            </Card.Root>
          </Grid>
        </Card.Body>
      </Card.Root>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <Card.Root>
          <Card.Body textAlign="center" py={12}>
            <Box mb={4}>
              <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
            </Box>
            <Heading size="md" color="fg.default" mb={2}>
              {results.length === 0 ? 'No analysis results found' : 'No segments match the current filter'}
            </Heading>
            <Text color="fg.muted">
              {results.length === 0 ? 'Run analysis to generate sub-datasets.' : 'Try changing the filter to see more results.'}
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" }} gap={6}>
          {filteredResults.map((result) => (
            <GridItem key={result.id}>
              <Card.Root
                _hover={{
                  shadow: "lg",
                  transform: "translateY(-2px)",
                  transition: "all 0.2s"
                }}
                transition="all 0.2s"
                cursor="pointer"
              >
                <Card.Header pb={3}>
                  <Flex align="center" justify="space-between">
                    <Link 
                      href={`/segment/${encodeURIComponent(result.id)}${searchParams.stream ? `?stream=${searchParams.stream}` : ''}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <HStack gap={2}>
                        {result.trendDirection === 'UP' ? (
                          <TrendingUp size={20} color="var(--chakra-colors-green-600)" />
                        ) : (
                          <TrendingDown size={20} color="var(--chakra-colors-red-600)" />
                        )}
                        <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                          {result.trendDirection}
                        </Text>
                      </HStack>
                    </Link>
                    <HStack gap={2}>
                      {searchParams.stream && !isStreamTerminated && (
                        <DeleteSegmentButton
                          segmentId={result.id}
                          streamId={searchParams.stream}
                          isLastSegment={result.id === lastSegmentId}
                        />
                      )}
                        <Badge
                          colorPalette={
                            result.schemaType === 'R' ? 'red' :
                            result.schemaType === 'V' ? 'purple' : 'gray'
                          }
                          variant="subtle"
                          size="sm"
                        >
                          {result.schemaType === 'UNCLASSIFIED' ? 'Unclassified' : result.schemaType}
                        </Badge>
                        {result.mlClassed && (
                          <Badge
                            bg={getMlBadgeColor(result.mlResult)}
                            color={result.mlResult === 'UNCLASSIFIED' ? 'gray.900' : 'white'}
                            variant="solid"
                            size="sm"
                          >
                            ML
                          </Badge>
                        )}
                        <Badge
                          colorPalette={getPatternBadgeColor(getPatternStatus(result.patternPoint))}
                          variant="subtle"
                          size="sm"
                        >
                          P
                        </Badge>
                      </HStack>
                    </Flex>
                  </Card.Header>

                  <Card.Body pt={0}>
                    <Link 
                      href={`/segment/${encodeURIComponent(result.id)}${searchParams.stream ? `?stream=${searchParams.stream}` : ''}`}
                      style={{ display: 'block' }}
                    >
                      <VStack gap={4} align="stretch">
                        <HStack gap={2} justify="space-between">
                          <HStack gap={2}>
                            <Clock size={16} color="var(--chakra-colors-gray-500)" />
                            <Text fontSize="sm" color="fg.muted">
                              {formatTime(result.segmentStart.toISOString())} - {formatTime(result.segmentEnd.toISOString())}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color="fg.muted" fontWeight="medium">
                            {formatDate(result.date)}
                          </Text>
                        </HStack>
                        
                        <HStack gap={4} justify="space-between" fontSize="sm">
                          <Text color="fg.muted">{result.pointCount} pts</Text>
                          <HStack gap={4}>
                            <Text color="fg.default" fontWeight="medium">x0: ${Number(result.x0).toFixed(2)}</Text>
                            <Text color="fg.muted">Avg: ${Number(result.averagePrice).toFixed(2)}</Text>
                          </HStack>
                        </HStack>

                        <Box borderTop="1px" borderColor="border.default" />

                        <HStack gap={2} justify="center">
                          <Text fontSize="sm" color="blue.600" fontWeight="medium">
                            Click to view details
                          </Text>
                          <ArrowRight size={16} color="var(--chakra-colors-blue-600)" />
                        </HStack>
                      </VStack>
                    </Link>
                  </Card.Body>
              </Card.Root>
            </GridItem>
          ))}
        </Grid>
      )}
    </VStack>
  );
}


// Utility functions
// Formate l'heure en format français sans appliquer le décalage horaire
// Utilise directement les valeurs UTC de la date pour éviter le changement d'heure
function formatTime(dateString: string) {
  const date = new Date(dateString);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Fonction pour déterminer le statut du pattern
function getPatternStatus(patternPoint: string | null): 'yes' | 'no' | 'unclassified' {
  if (patternPoint === null || patternPoint === '' || patternPoint === 'null') {
    return 'no';
  }
  if (patternPoint === 'UNCLASSIFIED' || patternPoint === 'unclassified') {
    return 'unclassified';
  }
  return 'yes';
}

// Fonction pour obtenir la couleur de la vignette P
function getPatternBadgeColor(status: 'yes' | 'no' | 'unclassified'): string {
  switch (status) {
    case 'yes':
      return 'green';
    case 'no':
      return 'red';
    case 'unclassified':
    default:
      return 'gray';
  }
}

function getMlBadgeColor(result: string | null | undefined): string {
  switch (result) {
    case 'TRUE':
      return 'green.500';
    case 'FALSE':
      return 'red.500';
    default:
      return 'yellow.400';
  }
}


// Main page component
export default function AnalysisPage({ params, searchParams }: AnalysisPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const symbol = resolvedParams.symbol;

  // Déterminer les breadcrumbs et le titre selon qu'un stream est sélectionné ou non
  const breadcrumbs = resolvedSearchParams.stream 
    ? [
        { label: `${symbol} Streams`, href: `/streams/${symbol}` },
        { label: `Analysis: ${symbol}` }
      ]
    : [
        { label: `Analysis: ${symbol}` }
      ];

  const pageTitle = resolvedSearchParams.stream 
    ? `Analysis: ${symbol} (Stream ${resolvedSearchParams.stream.split('_')[1]})`
    : `Analysis: ${symbol}`;

  const pageSubtitle = resolvedSearchParams.stream 
    ? "Stream-specific analysis and trend visualization"
    : "All streams analysis and trend visualization";

  return (
    <Navigation 
      breadcrumbs={breadcrumbs}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      pageActions={
        <ClientAnalysisStatus symbol={symbol} />
      }
    >
      <AnalysisStatsServer 
        symbol={symbol} 
        searchParams={resolvedSearchParams}
      />
    </Navigation>
  );
}