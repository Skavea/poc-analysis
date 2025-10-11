/**
 * Component: Segment Generated Image
 * ===================================
 * 
 * Affiche l'image base64 générée automatiquement pour un segment
 */

'use client';

import { Box, Card, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { BarChart3 } from 'lucide-react';

interface SegmentGeneratedImageProps {
  imageData: string | null;
  segmentId: string;
}

export default function SegmentGeneratedImage({ imageData, segmentId }: SegmentGeneratedImageProps) {
  // Si aucune image n'est disponible
  if (!imageData) {
    return (
      <Card.Root mt={6}>
        <Card.Header pb={4}>
          <Heading size="lg" color="fg.default">
            Graphique Généré
          </Heading>
        </Card.Header>
        <Card.Body pt={0}>
          <Box 
            height="400px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            bg="bg.subtle"
            borderRadius="md"
          >
            <VStack gap={3}>
              <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
              <Text color="fg.muted" fontSize="sm">
                Image non disponible pour ce segment
              </Text>
            </VStack>
          </Box>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root mt={6}>
      <Card.Header pb={4}>
        <Heading size="lg" color="fg.default">
          Graphique Généré
        </Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Box
          width="100%"
          borderRadius="md"
          overflow="hidden"
          border="1px solid"
          borderColor="border.subtle"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData}
            alt={`Graphique généré pour le segment ${segmentId}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </Box>
        
        {/* Informations supplémentaires */}
        <Box mt={4}>
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            Image générée automatiquement lors de la création du segment
          </Text>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

