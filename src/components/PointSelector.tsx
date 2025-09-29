/**
 * Client Component: Point Selector
 * ================================
 * 
 * Component for selecting points on the chart with click interaction
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  VStack, 
  HStack,
  Badge,
} from "@chakra-ui/react";
import { 
  X, 
  Target, 
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface PointSelectorProps {
  isActive: boolean;
  onPointSelect: (timestamp: string) => void;
  onCancel: () => void;
  pointsData: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  chartRef?: React.RefObject<HTMLDivElement>;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function PointSelector({ 
  isActive, 
  onPointSelect, 
  onCancel,
  pointsData,
  chartRef,
  isFullscreen = false,
  onToggleFullscreen
}: PointSelectorProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Fonction pour gérer le clic sur un point
  const handlePointClick = useCallback((timestamp: string) => {
    if (isActive) {
      onPointSelect(timestamp);
    }
  }, [isActive, onPointSelect]);

  // Fonction pour formater l'heure
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Fonction pour obtenir les données du point survolé
  const getHoveredPointData = (timestamp: string) => {
    return pointsData.find(point => point.timestamp === timestamp);
  };

  // Effet pour ajouter/supprimer les styles de sélection
  useEffect(() => {
    if (!isActive) return;

    const chartElement = chartRef?.current;
    if (!chartElement) return;

    // Ajouter une classe CSS pour indiquer le mode sélection
    chartElement.classList.add('point-selection-mode');
    
    return () => {
      chartElement.classList.remove('point-selection-mode');
    };
  }, [isActive, chartRef]);

  if (!isActive) return null;

  // Mode plein écran - Simplifié sans Modal pour l'instant
  if (isFullscreen) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={1000}
        bg="rgba(0, 0, 0, 0.8)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          bg="white"
          p={6}
          rounded="lg"
          shadow="xl"
          maxW="90vw"
          maxH="90vh"
          _dark={{ bg: "gray.800" }}
        >
          <VStack gap={4} align="stretch">
            <HStack justify="space-between">
              <HStack gap={2}>
                <Target size={20} />
                <Text fontSize="lg" fontWeight="medium">
                  Sélectionner un point sur le graphique
                </Text>
              </HStack>
              <Button
                onClick={onToggleFullscreen}
                variant="ghost"
                size="sm"
              >
                <Minimize2 size={16} />
              </Button>
            </HStack>
            
            <Text fontSize="sm" color="fg.muted">
              Mode sélection activé - Cliquez sur un point du graphique pour le sélectionner
            </Text>

            <HStack gap={2} justify="flex-end">
              <Button onClick={onCancel} variant="outline">
                <X size={16} style={{ marginRight: '8px' }} />
                Annuler
              </Button>
              <Button 
                onClick={() => onToggleFullscreen?.()} 
                variant="ghost"
              >
                <Minimize2 size={16} style={{ marginRight: '8px' }} />
                Mode normal
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    );
  }

  // Mode normal (overlay)
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={10}
      bg="rgba(0, 0, 0, 0.1)"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack gap={4} align="center">
        <Box 
          bg="white" 
          p={6} 
          rounded="lg" 
          shadow="xl"
          border="2px solid"
          borderColor="blue.200"
          _dark={{ bg: "gray.800", borderColor: "blue.700" }}
        >
          <VStack gap={4} align="center">
            <HStack gap={2}>
              <Target size={24} color="var(--chakra-colors-blue-500)" />
              <Text fontSize="lg" fontWeight="medium">
                Sélection de point
              </Text>
            </HStack>
            
            <Text fontSize="sm" color="fg.muted" textAlign="center" maxW="300px">
              Cliquez sur un point du graphique pour le sélectionner, ou utilisez le mode plein écran pour une meilleure précision.
            </Text>

            {hoveredPoint && (
              <Box 
                bg="blue.50" 
                p={3} 
                rounded="md" 
                w="full"
                _dark={{ bg: "blue.900" }}
              >
                <VStack gap={1} align="start">
                  <Text fontSize="sm" fontWeight="medium" color="blue.600">
                    Point survolé :
                  </Text>
                  <Text fontSize="sm">
                    {formatTime(hoveredPoint)}
                  </Text>
                  {getHoveredPointData(hoveredPoint) && (
                    <Text fontSize="xs" color="fg.muted">
                      Prix: ${getHoveredPointData(hoveredPoint)?.close.toFixed(2)}
                    </Text>
                  )}
                </VStack>
              </Box>
            )}

            <HStack gap={2}>
              <Button onClick={onCancel} variant="outline" size="sm">
                <X size={16} style={{ marginRight: '8px' }} />
                Annuler
              </Button>
              <Button 
                onClick={() => onToggleFullscreen?.()} 
                colorPalette="blue"
                size="sm"
              >
                <Maximize2 size={16} style={{ marginRight: '8px' }} />
                Plein écran
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
