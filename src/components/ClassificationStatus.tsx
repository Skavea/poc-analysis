/**
 * Server Component: Classification Status
 * =====================================
 * 
 * Affiche le statut de classification des éléments
 * S'affiche seulement s'il y a des éléments non classifiés
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
  Button,
  Heading,
  Badge
} from "@chakra-ui/react";
import { BarChart3, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import RegenerateImagesButton from '@/components/RegenerateImagesButton';

interface ClassificationStats {
  totalClassified: number;
  totalUnclassified: number;
  rClassified: number;
  patternPointsReferenced: number;
  hasUnclassified: boolean;
  nextUnclassifiedId?: string;
}

async function getClassificationStats(): Promise<ClassificationStats> {
  const allResults = await DatabaseService.getAllAnalysisResults();
  
  const totalClassified = allResults.filter(r => 
    r.schemaType !== 'UNCLASSIFIED' || 
    (r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== '')
  ).length;
  
  const totalUnclassified = allResults.filter(r => 
    r.schemaType === 'UNCLASSIFIED' && 
    (r.patternPoint === null || r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified' || r.patternPoint === 'null' || r.patternPoint === '')
  ).length;
  
  const rClassified = allResults.filter(r => r.schemaType === 'R').length;
  
  const patternPointsReferenced = allResults.filter(r => 
    r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== ''
  ).length;
  
  const unclassifiedResults = allResults.filter(r => 
    r.schemaType === 'UNCLASSIFIED' && 
    (r.patternPoint === null || r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified' || r.patternPoint === 'null' || r.patternPoint === '')
  );
  
  const nextUnclassifiedId = unclassifiedResults.length > 0 ? unclassifiedResults[0].id : undefined;
  
  return {
    totalClassified,
    totalUnclassified,
    rClassified,
    patternPointsReferenced,
    hasUnclassified: totalUnclassified > 0,
    nextUnclassifiedId
  };
}

export default async function ClassificationStatus() {
  const stats = await getClassificationStats();
  
  // Ne pas afficher le composant s'il n'y a pas d'éléments non classifiés
  if (!stats.hasUnclassified) {
    return null;
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={2} align="center">
          <AlertCircle size={20} color="var(--chakra-colors-orange-500)" />
          <Heading size="md" color="fg.default">
            Classification Status
          </Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={6}>
          {/* Main column - 3/4 */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
            {/* First card - General status */}
            <Card.Root>
              <Card.Header>
                <Heading size="sm" color="fg.default">General status</Heading>
              </Card.Header>
              <Card.Body>
                <VStack gap={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">Classified:</Text>
                    <HStack gap={1}>
                      <CheckCircle size={16} color="var(--chakra-colors-green-500)" />
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        {stats.totalClassified}
                      </Text>
                    </HStack>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">Unclassified:</Text>
                    <HStack gap={1}>
                      <AlertCircle size={16} color="var(--chakra-colors-orange-500)" />
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        {stats.totalUnclassified}
                      </Text>
                    </HStack>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Second card - Classification details */}
            <Card.Root>
              <Card.Header>
                <Heading size="sm" color="fg.default">Classification details</Heading>
              </Card.Header>
              <Card.Body>
                <VStack gap={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">R classified:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="red.600">
                      {stats.rClassified}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">Pattern points:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      {stats.patternPointsReferenced}
                    </Text>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </Grid>

          {/* Right column - 1/4 - Action button */}
          <Card.Root>
            <Card.Body>
              <VStack gap={4} align="stretch" justify="center" minH="120px">
                <Text fontSize="sm" color="fg.muted" textAlign="center">
                  Continue classification
                </Text>
                {stats.nextUnclassifiedId && (
                  <Button
                    asChild
                    colorPalette="blue"
                    size="md"
                    w="full"
                  >
                    <Link href={`/segment/${encodeURIComponent(stats.nextUnclassifiedId)}`}>
                      <BarChart3 size={18} style={{ marginRight: '8px' }} />
                      Classify
                      <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="md"
                  w="full"
                >
                  <Link href={`/analysis/all`}>
                    <BarChart3 size={18} style={{ marginRight: '8px' }} />
                    All segments
                  </Link>
                </Button>
                <RegenerateImagesButton />
              </VStack>
            </Card.Body>
          </Card.Root>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
