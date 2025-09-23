import { Box, VStack } from '@chakra-ui/react';
import SchemaUpdateForm from '@/components/SchemaUpdateForm';

export default function SchemaDebugPage() {
  return (
    <VStack gap={4} p={4}>
      <Box>Schema Update Form Test</Box>
      <SchemaUpdateForm segmentId="test" initialSchemaType="UNCLASSIFIED" />
    </VStack>
  );
}
