import { use } from 'react';
import { Box, Text } from '@chakra-ui/react';

interface SegmentPageProps {
  params: Promise<{ id: string }>;
}

export default function SegmentSimplePage({ params }: SegmentPageProps) {
  const resolvedParams = use(params);
  
  return (
    <Box p={4}>
      <Text>Segment ID: {resolvedParams.id}</Text>
    </Box>
  );
}
