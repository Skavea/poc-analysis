import { use } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import SegmentChart from '@/components/SegmentChart';

interface SegmentPageProps {
  params: Promise<{ id: string }>;
}

export default function SegmentDebugPage({ params }: SegmentPageProps) {
  const resolvedParams = use(params);
  
  // Mock data for testing
  const mockPointsData = [
    { timestamp: '2025-09-22T12:00:00Z', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    { timestamp: '2025-09-22T12:01:00Z', open: 102, high: 108, low: 98, close: 106, volume: 1200 },
  ];
  
  const mockAnalysis = {
    x0: '106',
    minPrice: '95',
    maxPrice: '108',
    averagePrice: '101.5'
  };
  
  return (
    <VStack gap={4} p={4}>
      <Text>Segment ID: {resolvedParams.id}</Text>
      <SegmentChart pointsData={mockPointsData} analysis={mockAnalysis} />
    </VStack>
  );
}
