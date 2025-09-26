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
import { TrendingUp, TrendingDown, Clock, BarChart3, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AnalysisStatusScript from '@/components/AnalysisStatusScript';
import ClientAnalysisStatus from '@/components/ClientAnalysisStatus';
import AnalysisFilter from '@/components/AnalysisFilter';
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
  searchParams: Promise<{ filter?: string }>;
}

// Server component for analysis results with stats
async function AnalysisStatsServer({ 
  symbol, 
  searchParams,
  setHasExistingAnalysis 
}: { 
  symbol: string;
  searchParams: { filter?: string };
  setHasExistingAnalysis?: (value: boolean) => void;
}) {
  const results = await DatabaseService.getAnalysisResults(symbol);
  
  const rCount = results.filter(r => r.schemaType === 'R').length;
  const vCount = results.filter(r => r.schemaType === 'V').length;
  const unclassifiedCount = results.filter(r => r.schemaType === 'UNCLASSIFIED').length;
  const hasExistingAnalysis = results.length > 0;
  
  // If setHasExistingAnalysis is provided, call it with the current status
  if (setHasExistingAnalysis) {
    setHasExistingAnalysis(hasExistingAnalysis);
  }

  // Filter results based on search params
  const filter = searchParams.filter || 'all';
  const filteredResults = filter === 'all' 
    ? results 
    : results.filter(result => result.schemaType === filter);

  return (
    <VStack gap={8} align="stretch">
      {/* Hidden script to update client components */}
      <AnalysisStatusScript hasExistingAnalysis={hasExistingAnalysis} />
      


      {/* Stats and Filters */}
      <Card.Root>
        <Card.Header pb={4}>
          <Flex align="center" justify="space-between">
            <Heading size="lg" color="fg.default">
              Analysis Results
            </Heading>
            <AnalysisFilter 
              totalCount={results.length}
              rCount={rCount}
              vCount={vCount}
              unclassifiedCount={unclassifiedCount}
            />
          </Flex>
        </Card.Header>

        <Card.Body pt={0}>
          <HStack gap={6} justify="space-between" align="center">
            <HStack gap={6}>
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">Total:</Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.600">{results.length}</Text>
              </HStack>
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">R:</Text>
                <Text fontSize="lg" fontWeight="bold" color="red.600">{rCount}</Text>
              </HStack>
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">V:</Text>
                <Text fontSize="lg" fontWeight="bold" color="purple.600">{vCount}</Text>
              </HStack>
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">Unclassified:</Text>
                <Text fontSize="lg" fontWeight="bold" color="gray.600">{unclassifiedCount}</Text>
              </HStack>
            </HStack>
            <AnalysisFilter 
              totalCount={results.length}
              rCount={rCount}
              vCount={vCount}
              unclassifiedCount={unclassifiedCount}
            />
          </HStack>
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
                asChild
              >
                <Link href={`/segment/${encodeURIComponent(result.id)}`}>
                  <Card.Header pb={3}>
                    <Flex align="center" justify="space-between">
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
                    </Flex>
                  </Card.Header>

                  <Card.Body pt={0}>
                    <VStack gap={4} align="stretch">
                      <HStack gap={2}>
                        <Clock size={16} color="var(--chakra-colors-gray-500)" />
                        <Text fontSize="sm" color="fg.muted">
                          {formatTime(result.segmentStart.toISOString())} - {formatTime(result.segmentEnd.toISOString())}
                        </Text>
                      </HStack>
                      
                      <HStack gap={4} justify="space-between" fontSize="sm">
                        <Text color="fg.muted">{result.pointCount} pts • {formatDate(result.date)}</Text>
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
                  </Card.Body>
                </Link>
              </Card.Root>
            </GridItem>
          ))}
        </Grid>
      )}
    </VStack>
  );
}


// Utility functions
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}


// Main page component
export default function AnalysisPage({ params, searchParams }: AnalysisPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const symbol = resolvedParams.symbol;

  return (
    <Navigation 
      breadcrumbs={[
        { label: `Analysis: ${symbol}` }
      ]}
      pageTitle={`Analysis: ${symbol}`}
      pageSubtitle="Sub-datasets and trend analysis"
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