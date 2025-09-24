/**
 * Dashboard Page
 * =============
 * 
 * Overview of all stock classifications and progress
 * Shows statistics on R/V classifications across all stocks
 */

import { use } from 'react';
import { DatabaseService } from '@/lib/db';
import Navigation from '@/components/layout/Navigation';
import Link from 'next/link';
import { 
  Box, 
  Card, 
  Grid, 
  GridItem, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Button,
  Flex,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Divider
} from '@chakra-ui/react';
import { Progress } from '@/components/ui/Progress';
import { BarChart3, TrendingUp, TrendingDown, Play, PieChart } from 'lucide-react';

async function fetchStats() {
  return await DatabaseService.getAnalysisStats();
}

async function fetchStockData() {
  return await DatabaseService.getAllStockData();
}

async function fetchAllAnalysisResults() {
  return await DatabaseService.getAllAnalysisResults();
}

export default function DashboardPage() {
  const stats = use(fetchStats());
  const stockData = use(fetchStockData());
  const allResults = use(fetchAllAnalysisResults());
  
  // Calculate classification progress
  const totalSegments = stats.totalSegments;
  const classifiedSegments = stats.rSchemas + stats.vSchemas;
  const classificationProgress = totalSegments > 0 
    ? Math.round((classifiedSegments / totalSegments) * 100) 
    : 0;
  
  // Group analysis results by symbol
  const resultsBySymbol = allResults.reduce((acc, result) => {
    if (!acc[result.symbol]) {
      acc[result.symbol] = {
        total: 0,
        r: 0,
        v: 0,
        unclassified: 0
      };
    }
    
    acc[result.symbol].total += 1;
    
    if (result.schemaType === 'R') {
      acc[result.symbol].r += 1;
    } else if (result.schemaType === 'V') {
      acc[result.symbol].v += 1;
    } else {
      acc[result.symbol].unclassified += 1;
    }
    
    return acc;
  }, {} as Record<string, { total: number; r: number; v: number; unclassified: number; }>);
  
  return (
    <Navigation
      breadcrumbs={[
        { label: 'Dashboard' }
      ]}
      pageTitle="Classification Dashboard"
      pageSubtitle="Track classification progress across all stocks"
    >
      <VStack spacing={8} align="stretch">
        {/* Overall Stats */}
        <Card.Root>
          <Card.Header pb={4}>
            <Heading size="lg" color="fg.default">
              Overall Classification Progress
            </Heading>
          </Card.Header>
          <Card.Body pt={0}>
            <VStack spacing={6} align="stretch">
              <StatGroup>
                <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} width="100%">
                  <Stat>
                    <StatLabel>Total Segments</StatLabel>
                    <StatNumber>{totalSegments}</StatNumber>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>R Schemas</StatLabel>
                    <StatNumber color="red.600">{stats.rSchemas}</StatNumber>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>V Schemas</StatLabel>
                    <StatNumber color="purple.600">{stats.vSchemas}</StatNumber>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Unclassified</StatLabel>
                    <StatNumber color="gray.600">{stats.unclassifiedSchemas}</StatNumber>
                  </Stat>
                </Grid>
              </StatGroup>
              
              <Box>
                <HStack mb={2} justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">Classification Progress:</Text>
                  <Text fontSize="sm" fontWeight="bold">{classifiedSegments}/{totalSegments} ({classificationProgress}%)</Text>
                </HStack>
                <Progress value={classificationProgress} size="md" colorPalette="blue" borderRadius="md" />
              </Box>
              
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  Trend Distribution: {stats.upTrends} UP / {stats.downTrends} DOWN
                </Text>
                <HStack>
                  <TrendingUp size={16} color="var(--chakra-colors-green-600)" />
                  <Text fontSize="sm" color="green.600" fontWeight="medium">{stats.upTrends}</Text>
                  <Text fontSize="sm" color="fg.muted">vs</Text>
                  <Text fontSize="sm" color="red.600" fontWeight="medium">{stats.downTrends}</Text>
                  <TrendingDown size={16} color="var(--chakra-colors-red-600)" />
                </HStack>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
        
        {/* Stock Progress */}
        <Card.Root>
          <Card.Header pb={4}>
            <Heading size="lg" color="fg.default">
              Classification by Stock
            </Heading>
          </Card.Header>
          <Card.Body pt={0}>
            <VStack spacing={4} align="stretch">
              {stockData.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Box mb={4}>
                    <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
                  </Box>
                  <Heading size="md" color="fg.default" mb={2}>
                    No stocks found
                  </Heading>
                  <Text color="fg.muted">
                    Add stocks to start classification.
                  </Text>
                </Box>
              ) : (
                stockData.map((stock) => {
                  const stockStats = resultsBySymbol[stock.symbol] || { total: 0, r: 0, v: 0, unclassified: 0 };
                  const stockProgress = stockStats.total > 0 
                    ? Math.round(((stockStats.r + stockStats.v) / stockStats.total) * 100) 
                    : 0;
                    
                  return (
                    <Card.Root key={stock.symbol} variant="outline">
                      <Card.Body>
                        <VStack spacing={4} align="stretch">
                          <Flex justify="space-between" align="center">
                            <HStack>
                              <Heading size="md" color="fg.default">{stock.symbol}</Heading>
                              <Badge colorPalette={stockProgress === 100 ? 'green' : 'blue'} variant="subtle">
                                {stockProgress === 100 ? 'Complete' : `${stockProgress}%`}
                              </Badge>
                            </HStack>
                            
                            <HStack>
                              <Link href={`/analysis/${stock.symbol}`} passHref>
                                <Button size="sm" variant="outline">
                                  View Analysis
                                </Button>
                              </Link>
                              
                              <Link href={`/slideshow/${stock.symbol}`} passHref>
                                <Button size="sm" colorPalette="blue" leftIcon={<Play size={14} />}>
                                  Start Slideshow
                                </Button>
                              </Link>
                            </HStack>
                          </Flex>
                          
                          <Box>
                            <Progress value={stockProgress} size="sm" colorPalette="blue" borderRadius="md" />
                          </Box>
                          
                          <HStack justify="space-between">
                            <HStack spacing={4}>
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="fg.muted">Total:</Text>
                                <Text fontSize="sm" fontWeight="medium">{stockStats.total}</Text>
                              </HStack>
                              
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="fg.muted">R:</Text>
                                <Text fontSize="sm" fontWeight="medium" color="red.600">{stockStats.r}</Text>
                              </HStack>
                              
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="fg.muted">V:</Text>
                                <Text fontSize="sm" fontWeight="medium" color="purple.600">{stockStats.v}</Text>
                              </HStack>
                              
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="fg.muted">Unclassified:</Text>
                                <Text fontSize="sm" fontWeight="medium" color="gray.600">{stockStats.unclassified}</Text>
                              </HStack>
                            </HStack>
                            
                            <Text fontSize="xs" color="fg.muted">
                              {new Date(stock.createdAt).toLocaleDateString()}
                            </Text>
                          </HStack>
                        </VStack>
                      </Card.Body>
                    </Card.Root>
                  );
                })
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Navigation>
  );
}
