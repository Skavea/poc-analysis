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
import ExportClassifiedCsvButton from '@/components/ExportClassifiedCsvButton';
import MlClassificationButton from '@/components/MlClassificationButton';

interface ClassificationStats {
  totalClassified: number;
  totalUnclassified: number;
  rClassified: number;
  vClassified: number; // Nombre total de segments classifiés en V
  patternPointsReferenced: number;
  hasUnclassified: boolean;
  nextUnclassifiedId?: string;
  totalInvalid: number; // Nombre total de segments invalides parmi tous les segments
  mlClassifiedTotal: number; // Nombre total classés par ML
  mlClassifiedCorrect: number; // Nombre ML corrects (mlResult === schemaType)
  mlClassifiedIncorrect: number; // Nombre ML incorrects (mlResult !== schemaType)
  mlUnclassifiedTotal: number; // Nombre ML non classés (mlResult = 'UNCLASSIFIED')
}

async function getClassificationStats(): Promise<ClassificationStats> {
  const allResults = await DatabaseService.getAllAnalysisResults();
  
  // Compter le nombre total de segments invalides parmi tous les segments
  const totalInvalid = allResults.filter(r => r.invalid === true).length;
  
  // Filtrer les segments valides (exclure les invalides) pour tous les calculs
  const validResults = allResults.filter(r => r.invalid === false);
  
  // Compter les segments classifiés (excluant les invalides)
  // Ne pas compter les segments classés par ML (mlClassed = true)
  const totalClassified = validResults.filter(r => 
    r.mlClassed === false && (
      r.schemaType !== 'UNCLASSIFIED' || 
      (r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== '')
    )
  ).length;
  
  // Compter les segments non classifiés (excluant les invalides)
  const totalUnclassified = validResults.filter(r => 
    r.schemaType === 'UNCLASSIFIED' && 
    (r.patternPoint === null || r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified' || r.patternPoint === 'null' || r.patternPoint === '')
  ).length;
  
  // Compter les segments R classifiés (excluant les invalides)
  // Ne pas compter ceux classés par ML
  const rClassified = validResults.filter(r => r.schemaType === 'R' && r.mlClassed === false).length;
  
  // Compter le nombre total de segments classifiés en V (excluant les invalides)
  // Ne pas compter ceux classés par ML
  const vClassified = validResults.filter(r => r.schemaType === 'V' && r.mlClassed === false).length;
  
  // Compter les pattern points référencés (excluant les invalides)
  const patternPointsReferenced = validResults.filter(r => 
    r.patternPoint && r.patternPoint !== 'UNCLASSIFIED' && r.patternPoint !== 'unclassified' && r.patternPoint !== 'null' && r.patternPoint !== ''
  ).length;
  
  // Compteurs ML (sur segments valides)
  // Compté uniquement si mlClassed = true ET mlResult ∈ {'R','V'}
  // Aligné avec la demande: mlClassed = true ET mlResult != 'UNCLASSIFIED'
  const mlClassifiedTotal = validResults.filter(r => 
    r.mlClassed === true && r.mlResult !== 'UNCLASSIFIED'
  ).length;
  // "Correct" si un schéma humain existe (différent de UNCLASSIFIED) et correspond au résultat ML (R/V)
  // Aligné avec la demande: mlClassed = true ET mlResult = 'TRUE'
  const mlClassifiedCorrect = validResults.filter(r => 
    r.mlClassed === true && (r.mlResult === 'TRUE' || r.mlResult === 'true')
  ).length;
  // "Incorrect": mlClassed = true ET mlResult = 'FALSE'
  const mlClassifiedIncorrect = validResults.filter(r => 
    r.mlClassed === true && (r.mlResult === 'FALSE' || r.mlResult === 'false')
  ).length;
  // ML non classés: mlClassed = true et mlResult = 'UNCLASSIFIED'
  const mlUnclassifiedTotal = validResults.filter(r =>
    r.mlClassed === true && r.mlResult === 'UNCLASSIFIED'
  ).length;
  
  // Trouver le prochain segment non classifié (excluant les invalides)
  const unclassifiedResults = validResults.filter(r => 
    r.schemaType === 'UNCLASSIFIED' && 
    (r.patternPoint === null || r.patternPoint === 'UNCLASSIFIED' || r.patternPoint === 'unclassified' || r.patternPoint === 'null' || r.patternPoint === '')
  );
  
  const nextUnclassifiedId = unclassifiedResults.length > 0 ? unclassifiedResults[0].id : undefined;
  
  return {
    totalClassified,
    totalUnclassified,
    rClassified,
    vClassified,
    patternPointsReferenced,
    hasUnclassified: totalUnclassified > 0,
    nextUnclassifiedId,
    totalInvalid,
    mlClassifiedTotal,
    mlClassifiedCorrect,
    mlClassifiedIncorrect,
    mlUnclassifiedTotal
  };
}

export default async function ClassificationStatus() {
  const stats = await getClassificationStats();
  
  // Toujours afficher le composant, même s'il n'y a pas d'éléments non classifiés

  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={2} align="center">
          {/* Icône et titre selon l'état de classification */}
          {stats.hasUnclassified ? (
            <AlertCircle size={20} color="var(--chakra-colors-orange-500)" />
          ) : (
            <CheckCircle size={20} color="var(--chakra-colors-green-500)" />
          )}
          <Heading size="md" color="fg.default">
            {stats.hasUnclassified ? 'Classification Status' : 'All segments classified'}
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
                  {/* ML Classified counters */}
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">ML Classified:</Text>
                    <HStack gap={1}>
                      <CheckCircle size={16} color="var(--chakra-colors-green-500)" />
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        {stats.mlClassifiedTotal}
                      </Text>
                    </HStack>
                  </HStack>
                  {/* ML Unclassified */}
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">ML Unclassified:</Text>
                    <HStack gap={1}>
                      <AlertCircle size={16} color="var(--chakra-colors-orange-500)" />
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        {stats.mlUnclassifiedTotal}
                      </Text>
                    </HStack>
                  </HStack>
                  {/* Afficher le nombre de segments invalides sous Unclassified */}
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">Invalid segments:</Text>
                    <HStack gap={1}>
                      <AlertCircle size={16} color="var(--chakra-colors-red-500)" />
                      <Text fontSize="lg" fontWeight="bold" color="red.600">
                        {stats.totalInvalid}
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
                    <Text fontSize="sm" color="fg.muted">V classified:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="purple.600">
                      {stats.vClassified}
                    </Text>
                  </HStack>
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
                  {/* ML correctness details */}
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">ML correct:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="green.600">
                      {stats.mlClassifiedCorrect}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="fg.muted">ML incorrect:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="red.600">
                      {stats.mlClassifiedIncorrect}
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
                <ExportClassifiedCsvButton />
                <MlClassificationButton />
              </VStack>
            </Card.Body>
          </Card.Root>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
