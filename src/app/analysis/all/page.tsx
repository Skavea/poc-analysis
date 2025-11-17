import { DatabaseService } from '@/lib/db';
import { 
  VStack, 
  Card, 
  Heading, 
  Grid, 
  GridItem, 
  HStack, 
  Text, 
  Box, 
  Badge,
  Flex
} from '@chakra-ui/react';
import { BarChart3, TrendingUp, TrendingDown, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';
import AdvancedAnalysisFilter from '@/components/AdvancedAnalysisFilter';

interface AnalysisAllPageProps {
  searchParams: Promise<{
    schema?: string | string[];
    pattern?: string | string[];
    mlClassed?: string | string[];
    mlResult?: string | string[];
  }>;
}

export default async function AnalysisAllPage({ searchParams }: AnalysisAllPageProps) {
  const resolvedSearchParams = await searchParams;
  const results = await DatabaseService.getAllAnalysisResults();

  // Counts for filters
  const rCount = results.filter(r => r.schemaType === 'R').length;
  const vCount = results.filter(r => r.schemaType === 'V').length;
  const unclassifiedCount = results.filter(r => r.schemaType === 'UNCLASSIFIED').length;
  const patternYesCount = results.filter(r => r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== '').length;
  const patternNoCount = results.filter(r => r.patternPoint === null || r.patternPoint === '' || r.patternPoint === 'null').length;
  const patternUnclassifiedCount = results.filter(r => r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified').length;
  const mlClassedTrueCount = results.filter(r => r.mlClassed === true).length;
  const mlClassedFalseCount = results.length - mlClassedTrueCount;
  const mlResultTrueCount = results.filter(r => r.mlResult === 'TRUE').length;
  const mlResultFalseCount = results.filter(r => r.mlResult === 'FALSE').length;
  const mlResultUnclassifiedCount = results.filter(r => r.mlResult === 'UNCLASSIFIED').length;

  // Normalize filters
  const normalizeFilters = (value: string | string[] | undefined) => {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    return arr.filter(v => v && v !== 'all');
  };
  const schemaFilters = normalizeFilters(resolvedSearchParams.schema);
  const patternFilters = normalizeFilters(resolvedSearchParams.pattern);
  const mlClassedFilters = normalizeFilters(resolvedSearchParams.mlClassed);
  const mlResultFilters = normalizeFilters(resolvedSearchParams.mlResult);

  let filteredResults = results;
  if (schemaFilters.length > 0) {
    filteredResults = filteredResults.filter(r => schemaFilters.includes(r.schemaType));
  }
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
    <Navigation
      breadcrumbs={[{ label: 'Analysis: All' }]}
      pageTitle="Analysis: All Segments"
      pageSubtitle="Browse and review all segments across all symbols"
    >
      <VStack gap={8} align="stretch">
        {/* Summary + Filters */}
        <Card.Root>
          <Card.Header>
            <Heading size="lg" color="fg.default">
              All Segments
            </Heading>
          </Card.Header>
          <Card.Body>
            <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
              {/* Summary cards */}
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
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
                        <Text fontSize="sm" color="fg.muted">Classified:</Text>
                        <Text fontSize="lg" fontWeight="bold" color="green.600">{rCount + vCount}</Text>
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>

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

              {/* Filters */}
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
        <Card.Root>
          <Card.Body>
            {filteredResults.length === 0 ? (
              <VStack gap={2} align="center" py={10}>
                <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
                <Heading size="md" color="fg.default">No segments match the current filter</Heading>
                <Text color="fg.muted">Try changing the filter to see more results.</Text>
              </VStack>
            ) : (
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }} gap={6}>
                {filteredResults.map((result) => (
                  <GridItem key={result.id}>
                    <Card.Root
                      _hover={{ shadow: 'lg', transform: 'translateY(-2px)', transition: 'all 0.2s' }}
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
                                {result.symbol}
                              </Text>
                            </HStack>
                            <HStack gap={2}>
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
                        </Card.Body>
                      </Link>
                    </Card.Root>
                  </GridItem>
                ))}
              </Grid>
            )}
          </Card.Body>
        </Card.Root>
      </VStack>
    </Navigation>
  );
}

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

// Helpers copied from analysis page to compute P badge color
function getPatternStatus(patternPoint: string | null): 'yes' | 'no' | 'unclassified' {
  if (patternPoint === null || patternPoint === '' || patternPoint === 'null') {
    return 'no';
  }
  if (patternPoint === 'UNCLASSIFIED' || patternPoint === 'unclassified') {
    return 'unclassified';
  }
  return 'yes';
}

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


