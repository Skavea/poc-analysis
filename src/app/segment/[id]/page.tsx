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
import { TrendingUp, TrendingDown, Clock, BarChart3, DollarSign, TrendingUp as UpIcon, TrendingDown as DownIcon } from 'lucide-react';
import SegmentChart from '@/components/SegmentChart';
import SchemaUpdateForm from '@/components/SchemaUpdateForm';
import PointAnalysisCard from '@/components/PointAnalysisCard';
import BackButton from '@/components/BackButton';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Grid,
  GridItem,
  Badge,
  Button,
  Heading,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import Navigation from '@/components/layout/Navigation';

interface SegmentPageProps {
  params: Promise<{ id: string }>;
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

  return (
    <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap={6} minH="calc(100vh - 200px)">
      {/* Left Column - Chart */}
      <GridItem>
        <Card.Root>
          <Card.Header pb={4}>
            <Heading size="lg" color="fg.default">
              Price Chart
            </Heading>
          </Card.Header>
          <Card.Body pt={0}>
            <SegmentChart pointsData={pointsData} analysis={analysis} />
          </Card.Body>
        </Card.Root>
      </GridItem>

      {/* Right Column - Analysis Data */}
      <GridItem>
        <VStack gap={6} align="stretch">
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

          {/* Schema Update Form */}
          <Card.Root>
            <Card.Header pb={4}>
              <Heading size="lg" color="fg.default">
                Update Classification
              </Heading>
            </Card.Header>
            <Card.Body pt={0}>
              <SchemaUpdateForm segmentId={analysis.id} initialSchemaType={analysis.schemaType} />
            </Card.Body>
          </Card.Root>
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

function getSchemaTypeColor(schemaType: string) {
  switch (schemaType) {
    case 'R':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'V':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'UNCLASSIFIED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getTrendIcon(trend: string) {
  return trend === 'UP' ? (
    <TrendingUp height="1.25rem" width="1.25rem" color="green.500" />
  ) : (
    <TrendingDown height="1.25rem" width="1.25rem" color="red.500" />
  );
}

// Main page component
export default function SegmentPage({ params }: SegmentPageProps) {
  const resolvedParams = use(params);
  const segmentId = resolvedParams.id;

  // Get segment data to access symbol for breadcrumb
  const segmentData = use(DatabaseService.getSegmentData(segmentId));
  const symbol = segmentData?.symbol || '';

  return (
    <Navigation 
      breadcrumbs={[
        { label: 'Analysis', href: `/analysis/${symbol}` },
        { label: 'Segment Details' }
      ]}
      pageTitle="Segment Analysis"
      pageSubtitle="Detailed price analysis and visualization"
      pageActions={<BackButton href={`/analysis/${symbol}`} label="Back to Analysis" />}
    >
      <SegmentDetailServer segmentId={segmentId} />
    </Navigation>
  );
}