'use client';

import { HStack, Text } from "@chakra-ui/react";
import { BarChart3 } from "lucide-react";
import RunAnalysisButton from "./RunAnalysisButton";

interface AnalysisStatusActionProps {
  symbol: string;
  hasExistingAnalysis: boolean;
}

export default function AnalysisStatusAction({ symbol, hasExistingAnalysis }: AnalysisStatusActionProps) {
  // If analysis doesn't exist, show the run button
  if (!hasExistingAnalysis) {
    return <RunAnalysisButton symbol={symbol} />;
  }
  
  // If analysis exists, show the status badge
  return (
    <HStack 
      gap={2} 
      px={4} 
      py={2} 
      bg="blue.50" 
      rounded="md"
      borderWidth="1px"
      borderColor="blue.100"
      _dark={{
        bg: "blue.900",
        borderColor: "blue.800",
      }}
    >
      <BarChart3 size={16} color="var(--chakra-colors-blue-600)" />
      <Text fontSize="sm" color="blue.600" fontWeight="medium">
        Analysis Complete
      </Text>
    </HStack>
  );
}
