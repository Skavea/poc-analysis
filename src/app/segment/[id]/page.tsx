/**
 * Page 3: Segment Detail
 * ======================
 * 
 * Left: Interactive price chart (TradingView style)
 * Right: Analysis data and enhancement options
 * Choose R or V schema type
 * Save enhancement to mark segment as enhanced
 */

import { use } from 'react';
import { DatabaseService } from '@/lib/db';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import SegmentChart from '@/components/SegmentChart';
import PatternClassificationForm from '@/components/PatternClassificationForm';
import PointAnalysisCard from '@/components/PointAnalysisCard';
import BackButton from '@/components/BackButton';
import NextAnalysisHandler from '@/components/NextAnalysisHandler';
import ClassificationSuccessNotification from '@/components/ClassificationSuccessNotification';
import ExportChartButton from '@/components/ExportChartButton';
import SegmentGeneratedImage from '@/components/SegmentGeneratedImage';
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
  Button,
} from "@chakra-ui/react";
import Navigation from '@/components/layout/Navigation';
import Link from 'next/link';

interface SegmentPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stream?: string }>;
}

// Server component for segment data
async function SegmentDetailServer({ segmentId }: { segmentId: string }) {
  const segmentData = await DatabaseService.getSegmentData(segmentId);

  if (!segmentData) {
    return (
      <Card.Root>
        <Card.Body textAlign="center" py={12}>
          <Box mb={4}>
            <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
          </Box>
          <Heading size="md" color="fg.default" mb={2}>
            Segment not found
          </Heading>
          <Text color="fg.muted">
            The requested segment could not be found.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  const { pointsData, ...analysis } = segmentData;
  
  // Récupérer l'image générée pour ce segment
  const imageData = await DatabaseService.getAnalysisResultImage(segmentId);
  
  // Déterminer si l'élément est classifié
  const isClassified = analysis.schemaType !== 'UNCLASSIFIED' || 
    (analysis.patternPoint && analysis.patternPoint !== 'UNCLASSIFIED' && analysis.patternPoint !== 'unclassified' && analysis.patternPoint !== 'null' && analysis.patternPoint !== '');
  
  // Trouver le prochain élément non classifié
  const allResults = await DatabaseService.getAllAnalysisResults();
  const unclassifiedResults = allResults.filter(r => 
    r.schemaType === 'UNCLASSIFIED' && 
    (r.patternPoint === null || r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified' || r.patternPoint === 'null' || r.patternPoint === '')
  );
  const nextUnclassifiedId = unclassifiedResults.length > 0 ? unclassifiedResults[0].id : null;

  return (
    <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap={6} minH="calc(100vh - 200px)">
      {/* Left Column - Chart */}
      <GridItem>
        <Card.Root>
          <Card.Header pb={4}>
            <HStack justify="space-between" align="center">
              <Heading size="lg" color="fg.default">
                Price Chart
              </Heading>
              <ExportChartButton analysis={analysis} />
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <SegmentChart 
              pointsData={pointsData} 
              analysis={analysis} 
              patternPoint={analysis.patternPoint}
            />
            
            {/* Legend */}
            <Box mt={4} display="flex" flexWrap="wrap" gap={4} fontSize="sm">
              <HStack gap={2}>
                <Box width="12px" height="12px" bg="blue.500" rounded="full" />
                <Text>Price</Text>
              </HStack>
              <HStack gap={2}>
                <Box width="12px" height="12px" bg="red.500" rounded="full" />
                <Text>x0 (Last Point)</Text>
              </HStack>
              {analysis.patternPoint && analysis.patternPoint !== 'UNCLASSIFIED' && analysis.patternPoint !== 'unclassified' && analysis.patternPoint !== 'null' && analysis.patternPoint !== '' && (
                <HStack gap={2}>
                  <Box width="12px" height="12px" bg="#eab308" rounded="full" />
                  <Text>Pattern Origin</Text>
                </HStack>
              )}
              <HStack gap={2}>
                <Box width="12px" height="4px" bg="purple.500" />
                <Text>Average</Text>
              </HStack>
              <HStack gap={2}>
                <Box width="12px" height="4px" bg="red.500" />
                <Text>Min</Text>
              </HStack>
              <HStack gap={2}>
                <Box width="12px" height="4px" bg="green.500" />
                <Text>Max</Text>
              </HStack>
            </Box>
          </Card.Body>
        </Card.Root>
        
        {/* Image générée automatiquement */}
        <SegmentGeneratedImage 
          imageData={imageData?.imgData || null} 
          segmentId={segmentId} 
        />
      </GridItem>

      {/* Right Column - Analysis Data */}
      <GridItem>
        <VStack gap={6} align="stretch">
          {/* Update Classification - En haut si non classifié */}
          {!isClassified && (
            <Card.Root>
              <Card.Header pb={4}>
                <Heading size="lg" color="fg.default">
                  Update Classification
                </Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <PatternClassificationForm 
                  segmentId={analysis.id} 
                  initialSchemaType={analysis.schemaType}
                  initialPatternPoint={analysis.patternPoint}
                  pointsData={pointsData || []}
                />
              </Card.Body>
            </Card.Root>
          )}

          {/* Analysis Summary */}
          <Card.Root>
            <Card.Header pb={4}>
              <Heading size="lg" color="fg.default">
                Analysis Summary
              </Heading>
            </Card.Header>
            <Card.Body pt={0}>
              <VStack gap={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Symbol
                  </Text>
                  <Text fontSize="sm" color="fg.default" fontWeight="semibold">
                    {analysis.symbol}
                  </Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Date
                  </Text>
                  <Text fontSize="sm" color="fg.default" fontWeight="semibold">
                    {analysis.date}
                  </Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Time Range
                  </Text>
                  <Text fontSize="sm" color="fg.default">
                    {formatTime(analysis.segmentStart.toISOString())} - {formatTime(analysis.segmentEnd.toISOString())}
                  </Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Data Points
                  </Text>
                  <Text fontSize="sm" color="fg.default" fontWeight="semibold">
                    {analysis.pointCount}
                  </Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Trend Direction
                  </Text>
                  <HStack gap={2}>
                    {getTrendIcon(analysis.trendDirection)}
                    <Text 
                      fontSize="sm" 
                      fontWeight="semibold"
                      color={analysis.trendDirection === 'UP' ? 'green.600' : 'red.600'}
                    >
                      {analysis.trendDirection}
                    </Text>
                  </HStack>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Patterns
                  </Text>
                  {/* Debug: {JSON.stringify(analysis.patternPoint)} */}
                  {analysis.patternPoint === null || analysis.patternPoint === 'UNCLASSIFIED' || analysis.patternPoint === 'unclassified' ? (
                    <Badge colorPalette="gray" variant="subtle" size="sm">
                      Unclassified
                    </Badge>
                  ) : analysis.patternPoint === '' || analysis.patternPoint === 'null' ? (
                    <Badge colorPalette="red" variant="subtle" size="sm">
                      No
                    </Badge>
                  ) : (
                    <Text fontSize="sm" fontWeight="semibold" color="#eab308">
                      {new Date(analysis.patternPoint).toLocaleTimeString()}
                    </Text>
                  )}
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Classification
                  </Text>
                  <Badge
                    colorPalette={
                      analysis.schemaType === 'R' ? 'red' :
                      analysis.schemaType === 'V' ? 'purple' : 'gray'
                    }
                    variant="subtle"
                    size="sm"
                  >
                    {analysis.schemaType === 'UNCLASSIFIED' ? 'Unclassified' : analysis.schemaType}
                  </Badge>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Price Analysis */}
          <Card.Root>
            <Card.Header pb={4}>
              <Heading size="lg" color="fg.default">
                Price Analysis
              </Heading>
            </Card.Header>
            <Card.Body pt={0}>
              <VStack gap={3} align="stretch">
                <HStack gap={4} justify="space-between">
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted">x0:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">${Number(analysis.x0).toFixed(2)}</Text>
                  </HStack>
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted">Avg:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="green.600">${Number(analysis.averagePrice).toFixed(2)}</Text>
                  </HStack>
                </HStack>
                <HStack gap={4} justify="space-between">
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted">Min:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="red.600">${Number(analysis.minPrice).toFixed(2)}</Text>
                  </HStack>
                  <HStack gap={2}>
                    <Text fontSize="sm" color="fg.muted">Max:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="purple.600">${Number(analysis.maxPrice).toFixed(2)}</Text>
                  </HStack>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
          
          {/* Point Analysis */}
          <PointAnalysisCard analysis={{...analysis, pointsData: pointsData}} />

          {/* Schema Update Form - En bas si classifié */}
          {isClassified && (
            <Card.Root>
              <Card.Header pb={4}>
                <Heading size="lg" color="fg.default">
                  Update Classification
                </Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <PatternClassificationForm 
                  segmentId={analysis.id} 
                  initialSchemaType={analysis.schemaType}
                  initialPatternPoint={analysis.patternPoint}
                  pointsData={pointsData || []}
                />
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </GridItem>
    </Grid>
  );
}


// Utility functions
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}


function getTrendIcon(trend: string) {
  return trend === 'UP' ? (
    <TrendingUp height="1.25rem" width="1.25rem" color="green.500" />
  ) : (
    <TrendingDown height="1.25rem" width="1.25rem" color="red.500" />
  );
}

// Main page component
export default function SegmentPage({ params, searchParams }: SegmentPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const segmentId = resolvedParams.id;
  const streamId = resolvedSearchParams.stream;

  return (
    <SegmentPageServer segmentId={segmentId} streamId={streamId} />
  );
}

// Server component for the full page
async function SegmentPageServer({ segmentId, streamId }: { segmentId: string; streamId?: string }) {
  // Get segment data to access symbol for breadcrumb
  const segmentData = await DatabaseService.getSegmentData(segmentId);
  const symbol = segmentData?.symbol || '';

  // Déterminer si l'élément actuel est classifié
  const isCurrentClassified = segmentData && (
    segmentData.schemaType !== 'UNCLASSIFIED' || 
    (segmentData.patternPoint && segmentData.patternPoint !== 'UNCLASSIFIED' && segmentData.patternPoint !== 'unclassified' && segmentData.patternPoint !== 'null' && segmentData.patternPoint !== '')
  );

  // Trouver le prochain élément non classifié
  const allResults = await DatabaseService.getAllAnalysisResults();
  const unclassifiedResults = allResults.filter(r => 
    r.schemaType === 'UNCLASSIFIED' && 
    (r.patternPoint === null || r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified' || r.patternPoint === 'null' || r.patternPoint === '')
  );
  const nextUnclassifiedId = unclassifiedResults.length > 0 ? unclassifiedResults[0].id : null;

  // Déterminer les breadcrumbs selon le contexte (stream ou non)
  const breadcrumbs = streamId 
    ? [
        { label: `${symbol} Streams`, href: `/streams/${symbol}` },
        { label: `Analysis: ${symbol}`, href: `/analysis/${symbol}?stream=${streamId}` },
        { label: 'Segment Details' }
      ]
    : [
        { label: `Analysis: ${symbol}`, href: `/analysis/${symbol}` },
        { label: 'Segment Details' }
      ];

  // URL de retour selon le contexte
  const backUrl = streamId ? `/analysis/${symbol}?stream=${streamId}` : `/analysis/${symbol}`;

  return (
    <Navigation 
      breadcrumbs={breadcrumbs}
      pageTitle="Segment Analysis"
      pageSubtitle="Detailed price analysis and visualization"
      pageActions={
        <HStack gap={2}>
          <BackButton href={backUrl} label="Back to Analysis" />
          {nextUnclassifiedId && (
            <Button
              asChild
              colorPalette={isCurrentClassified ? "green" : "blue"}
              variant={isCurrentClassified ? "solid" : "outline"}
              size="sm"
            >
              <Link href={`/segment/${encodeURIComponent(nextUnclassifiedId)}${streamId ? `?stream=${streamId}` : ''}`}>
                Next Analysis
              </Link>
            </Button>
          )}
        </HStack>
      }
    >
      <NextAnalysisHandler 
        currentSegmentId={segmentId}
        isClassified={isCurrentClassified || false}
        nextUnclassifiedId={nextUnclassifiedId || undefined}
      />
      <ClassificationSuccessNotification 
        isClassified={isCurrentClassified || false}
        nextUnclassifiedId={nextUnclassifiedId || undefined}
      />
      <SegmentDetailServer segmentId={segmentId} />
    </Navigation>
  );
}