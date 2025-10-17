/**
 * Streams Selection Page
 * ======================
 * 
 * Page intermédiaire pour sélectionner les streams (datasets) d'un marché
 * avant d'accéder à la page d'analyse
 */

import { DatabaseService } from '@/lib/db';
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
} from "@chakra-ui/react";
import { BarChart3, Calendar, Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';

// Types
interface StreamsPageProps {
  params: Promise<{ symbol: string }>;
}

// Server component pour la liste des streams
async function StreamsListServer({ symbol }: { symbol: string }) {
  try {
    // Récupérer les streams avec leurs intervalles de dates et les statistiques de segments
    const [streamsWithDateRanges, segmentCountsBySymbol] = await Promise.all([
      DatabaseService.getStreamsWithDateRanges(symbol),
      DatabaseService.getSegmentCountsForSymbols([symbol.toUpperCase()]),
    ]);

    // Récupérer les statistiques de segments pour chaque stream spécifique
    const streamIds = streamsWithDateRanges.map(stream => stream.id);
    const segmentCountsByStream = await DatabaseService.getSegmentCountsForStreams(streamIds);

    return (
      <VStack gap={6} align="stretch">
        {streamsWithDateRanges.length === 0 ? (
          <Card.Root>
            <Card.Body textAlign="center" py={12}>
              <Box mb={4}>
                <Database size={48} color="gray" />
              </Box>
              <Heading size="md" color="fg.default" mb={2}>
                No streams found for {symbol}
              </Heading>
              <Text color="fg.muted">
                This symbol doesn't have any data streams available.
              </Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <>
            {/* Header avec statistiques globales */}
            <Card.Root>
              <Card.Body>
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={2}>
                    <Heading size="lg" color="fg.default">
                      {symbol} Streams
                    </Heading>
                    <Text color="fg.muted">
                      {streamsWithDateRanges.length} stream{streamsWithDateRanges.length > 1 ? 's' : ''} available
                    </Text>
                  </VStack>
                  <HStack gap={4}>
                    <HStack gap={2}>
                      <Database size={16} color="var(--chakra-colors-gray-500)" />
                      <Text fontSize="sm" color="fg.muted">
                        {streamsWithDateRanges.reduce((sum, stream) => sum + stream.totalPoints, 0).toLocaleString()} total points
                      </Text>
                    </HStack>
                    <HStack gap={2}>
                      <BarChart3 size={16} color="var(--chakra-colors-gray-500)" />
                      <Text fontSize="sm" color="fg.muted">
                        {segmentCountsBySymbol[symbol.toUpperCase()] ?? 0} total segments
                      </Text>
                    </HStack>
                  </HStack>
                </HStack>
              </Card.Body>
            </Card.Root>

            {/* Liste des streams */}
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
              {streamsWithDateRanges.map((stream) => (
                <GridItem key={stream.id} className="stagger-item">
                  <Card.Root
                    className="hover-lift"
                    variant="outline"
                  >
                    <Card.Header pb={3}>
                      <Flex align="center" justify="space-between">
                        <HStack gap={3}>
                          <Box
                            p={2}
                            bg="brand.50"
                            rounded="lg"
                            color="brand.600"
                          >
                            <Calendar size={20} />
                          </Box>
                          <VStack align="start" gap={0}>
                            <Text fontSize="lg" fontWeight="semibold" color="fg.default">
                              {stream.dateRange}
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                              {formatDate(stream.createdAt.toISOString())}
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge colorPalette="blue" variant="subtle">
                          {stream.marketType}
                        </Badge>
                      </Flex>
                    </Card.Header>
                    
                    <Card.Body pt={0}>
                      <VStack gap={4} align="stretch">
                        {/* Stats */}
                        <HStack gap={4} justify="space-between" fontSize="sm">
                          <HStack gap={2}>
                            <Database size={14} color="var(--chakra-colors-gray-500)" />
                            <Text color="fg.muted">{stream.totalPoints.toLocaleString()} points</Text>
                          </HStack>
                          <HStack gap={2}>
                            <BarChart3 size={14} color="var(--chakra-colors-gray-500)" />
                            <Text color="fg.muted">
                              {segmentCountsByStream[stream.id] ?? 0} segments
                            </Text>
                          </HStack>
                        </HStack>
                        
                        <Box borderTop="1px" borderColor="border.default" />
                        
                        {/* Actions */}
                        <Button
                          asChild
                          colorPalette="blue"
                          size="md"
                          w="full"
                        >
                          <Link href={`/analysis/${stream.symbol}?stream=${stream.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BarChart3 size={18} style={{ marginRight: '8px' }} />
                            Analyze Stream
                          </Link>
                        </Button>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                </GridItem>
              ))}
            </Grid>
          </>
        )}
      </VStack>
    );
  } catch (error) {
    console.error('Error fetching streams:', error);
    return (
      <Card.Root>
        <Card.Body textAlign="center" py={12}>
          <Box mb={4}>
            <Database size={48} color="red" />
          </Box>
          <Heading size="md" color="fg.default" mb={2}>
            Error loading streams
          </Heading>
          <Text color="fg.muted">
            Failed to load streams for {symbol}. Please try again.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }
}

// Utility functions
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
}


// Main page component
export default async function StreamsPage({ params }: StreamsPageProps) {
  const resolvedParams = await params;
  const symbol = resolvedParams.symbol.toUpperCase();

  return (
    <Navigation
      breadcrumbs={[
        { label: `${symbol} Streams` }
      ]}
      pageTitle={`${symbol} Data Streams`}
      pageSubtitle="Select a data stream to analyze market trends and patterns"
      pageActions={
        <HStack gap={2}>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} style={{ marginRight: '8px' }} />
              Back to Home
            </Link>
          </Button>
        </HStack>
      }
    >
      <StreamsListServer symbol={symbol} />
    </Navigation>
  );
}
