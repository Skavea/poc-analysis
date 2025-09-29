/**
 * Page 1: Stocks List
 * ===================
 * 
 * Lists all stocks that have been fetched and stored
 * User can add new stocks or click on existing ones
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
import { BarChart3, Calendar, Database } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';
import AddStockForm from '@/components/AddStockForm';
import ClassificationStatus from '@/components/ClassificationStatus';

// Server component for stock list
async function StockListServer() {
  const stocks = await DatabaseService.getAllStockData();
  const symbols = Array.from(new Set(stocks.map(s => s.symbol.toUpperCase())));
  const [segmentCounts, datasetCounts] = await Promise.all([
    DatabaseService.getSegmentCountsForSymbols(symbols),
    DatabaseService.getDatasetCountsForSymbols(symbols),
  ]);

  return (
    <VStack gap={6} align="stretch">
      {stocks.length === 0 ? (
        <Card.Root>
          <Card.Body textAlign="center" py={12}>
            <Box mb={4}>
              <Database size={48} color="gray" />
            </Box>
            <Heading size="md" color="fg.default" mb={2}>
              No stocks found
            </Heading>
            <Text color="fg.muted">
              Get started by adding a new stock dataset.
            </Text>
          </Card.Body>
        </Card.Root>
      ) : (
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" }} gap={6}>
              {stocks.map((stock) => (
                <GridItem key={stock.id} className="stagger-item">
                  <Card.Root
                    className="hover-lift"
                    cursor="pointer"
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
                        <BarChart3 size={24} />
                      </Box>
                      <VStack align="start" gap={0}>
                        <Text fontSize="xl" fontWeight="bold" color="fg.default">
                          {stock.symbol}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {formatDate(stock.createdAt.toISOString())}
                        </Text>
                      </VStack>
                    </HStack>
                    <Badge colorPalette="blue" variant="subtle">
                      Active
                    </Badge>
                  </Flex>
                </Card.Header>
                
                <Card.Body pt={0}>
                  <VStack gap={4} align="stretch">
                    {/* Stats - Single Line */}
                    <HStack gap={4} justify="space-between" fontSize="sm">
                      <HStack gap={2}>
                        <Calendar size={14} color="var(--chakra-colors-gray-500)" />
                        <Text color="fg.muted">{(datasetCounts[stock.symbol.toUpperCase()] ?? 1).toString()} {datasetCounts[stock.symbol.toUpperCase()] > 1 ? "Streams" : "Stream"}</Text>
                      </HStack>
                      <HStack gap={2}>
                        <Database size={14} color="var(--chakra-colors-gray-500)" />
                        <Text color="fg.muted">{stock.totalPoints.toLocaleString()} points</Text>
                      </HStack>
                    </HStack>

                    {/* Segments count under points, right-aligned */}
                    <HStack gap={2} justify="flex-end" fontSize="sm">
                      <BarChart3 size={14} color="var(--chakra-colors-gray-500)" />
                      <Text color="fg.muted">{segmentCounts[stock.symbol.toUpperCase()] ?? 0} {segmentCounts[stock.symbol.toUpperCase()] > 1 ? "Segments" : "Segment"}</Text>
                    </HStack>
                    
                    <Box borderTop="1px" borderColor="border.default" />
                    
                    {/* Actions */}
                    <Button
                      asChild
                      colorPalette="blue"
                      size="md"
                      w="full"
                    >
                      <Link href={`/analysis/${stock.symbol}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BarChart3 size={18} style={{ marginRight: '8px' }} />
                        View Analysis
                      </Link>
                    </Button>
                  </VStack>
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
function formatDate(dateString: string) {
  const date = new Date(dateString);
  // Use UTC to ensure consistent formatting between server and client
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
}

function getDateRange(data: Record<string, unknown> | unknown) {
  if (!data || typeof data !== 'object') return 'N/A';
  if (!data || typeof data !== 'object') return 'N/A';
  
  const timestamps = Object.keys(data).filter(key => 
    key.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  );
  
  if (timestamps.length === 0) return 'N/A';
  
  const sorted = timestamps.sort();
  const start = sorted[0].split(' ')[0];
  const end = sorted[sorted.length - 1].split(' ')[0];
  
  return start === end ? start : `${start} - ${end}`;
}

// Main page component
export default function HomePage() {
  return (
    <Navigation
      pageTitle="Stock Analysis Dashboard"
      pageSubtitle="Manage your stock datasets and analyze market trends with professional tools"
    >
      <VStack gap={8} align="stretch">
        {/* Classification Status */}
        <ClassificationStatus />

        {/* Add New Stock Form */}
        <AddStockForm />

        {/* Stocks List */}
        <Box>
          <Heading size="lg" color="fg.default" mb={6}>
            Available Stocks
          </Heading>
          <StockListServer />
        </Box>
      </VStack>
    </Navigation>
  );
}