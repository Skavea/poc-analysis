/**
 * Client Component: Result Stats Client
 * =====================================
 * 
 * Client wrapper pour afficher les statistiques de résultats
 */

'use client';

import { 
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Grid,
} from "@chakra-ui/react";
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ResultStatsClientProps {
  resultStats09: {
    totalResults: number;
    resultsCorrect: number;
    resultsIncorrect: number;
    successRate: number;
  };
  resultStats06: {
    totalResults: number;
    resultsCorrect: number;
    resultsIncorrect: number;
    successRate: number;
  };
  predictionStats: {
    totalTests: number;
    testsCorrect: number;
    testsIncorrect: number;
    testsUnanswered: number;
    successRate: number;
  };
}

export default function ResultStatsClient({ 
  resultStats09, 
  resultStats06, 
  predictionStats 
}: ResultStatsClientProps) {
  return (
    <div suppressHydrationWarning>
      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
      {/* Prediction result */}
      <Box borderWidth="1px" borderRadius="md" p={4} bg="bg.subtle">
        <Heading size="sm" color="fg.default" mb={4}>Prediction result</Heading>
        <VStack gap={3} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de test:</Text>
            <Text fontSize="lg" fontWeight="bold" color="blue.600">
              {predictionStats.totalTests}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de tests juste:</Text>
            <HStack gap={1}>
              <CheckCircle size={16} color="var(--chakra-colors-green-500)" />
              <Text fontSize="lg" fontWeight="bold" color="green.600">
                {predictionStats.testsCorrect}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de tests faux:</Text>
            <HStack gap={1}>
              <AlertCircle size={16} color="var(--chakra-colors-red-500)" />
              <Text fontSize="lg" fontWeight="bold" color="red.600">
                {predictionStats.testsIncorrect}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de tests non répondu:</Text>
            <HStack gap={1}>
              <AlertCircle size={16} color="var(--chakra-colors-orange-500)" />
              <Text fontSize="lg" fontWeight="bold" color="orange.600">
                {predictionStats.testsUnanswered}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Pourcentage de réussite:</Text>
            <Text fontSize="lg" fontWeight="bold" color={predictionStats.successRate >= 50 ? "green.600" : "red.600"}>
              {predictionStats.successRate.toFixed(2)}%
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* Result stats >= 0.9 */}
      <Box borderWidth="1px" borderRadius="md" p={4} bg="bg.subtle">
        <Heading size="sm" color="fg.default" mb={4}>Résultats {'>='} 0.9</Heading>
        <VStack gap={3} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de résultat total:</Text>
            <Text fontSize="lg" fontWeight="bold" color="blue.600">
              {resultStats09.totalResults}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de résultat juste:</Text>
            <HStack gap={1}>
              <CheckCircle size={16} color="var(--chakra-colors-green-500)" />
              <Text fontSize="lg" fontWeight="bold" color="green.600">
                {resultStats09.resultsCorrect}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de résultat faux:</Text>
            <HStack gap={1}>
              <AlertCircle size={16} color="var(--chakra-colors-red-500)" />
              <Text fontSize="lg" fontWeight="bold" color="red.600">
                {resultStats09.resultsIncorrect}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Pourcentage de réussite:</Text>
            <Text fontSize="lg" fontWeight="bold" color={resultStats09.successRate >= 50 ? "green.600" : "red.600"}>
              {resultStats09.successRate.toFixed(2)}%
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* Result stats >= 0.6 */}
      <Box borderWidth="1px" borderRadius="md" p={4} bg="bg.subtle">
        <Heading size="sm" color="fg.default" mb={4}>Résultats {'>='} 0.6</Heading>
        <VStack gap={3} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de résultat total:</Text>
            <Text fontSize="lg" fontWeight="bold" color="blue.600">
              {resultStats06.totalResults}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de résultat juste:</Text>
            <HStack gap={1}>
              <CheckCircle size={16} color="var(--chakra-colors-green-500)" />
              <Text fontSize="lg" fontWeight="bold" color="green.600">
                {resultStats06.resultsCorrect}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Nombre de résultat faux:</Text>
            <HStack gap={1}>
              <AlertCircle size={16} color="var(--chakra-colors-red-500)" />
              <Text fontSize="lg" fontWeight="bold" color="red.600">
                {resultStats06.resultsIncorrect}
              </Text>
            </HStack>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">Pourcentage de réussite:</Text>
            <Text fontSize="lg" fontWeight="bold" color={resultStats06.successRate >= 50 ? "green.600" : "red.600"}>
              {resultStats06.successRate.toFixed(2)}%
            </Text>
          </HStack>
        </VStack>
      </Box>
    </Grid>
    </div>
  );
}

