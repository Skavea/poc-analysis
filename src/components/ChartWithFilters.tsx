/**
 * Client Component: Chart with Point Filters
 * ===========================================
 * 
 * Wrapper component that manages point filtering (All, Red, Green)
 * and displays the filtered chart with consistent scales
 */

'use client';

import React, { useState, createContext, useContext } from 'react';
import { HStack, Button, Text } from '@chakra-ui/react';
import SegmentChart from './SegmentChart';

type PointFilter = 'all' | 'red' | 'green';

// Contexte pour partager l'état du filtre entre les instances
const FilterContext = createContext<{
  selectedFilter: PointFilter;
  setSelectedFilter: (filter: PointFilter) => void;
}>({
  selectedFilter: 'all',
  setSelectedFilter: () => {}
});

interface ChartWithFiltersProps {
  allPoints: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  redPoints?: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> | null;
  greenPoints?: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> | null;
  analysis: {
    x0: string;
    minPrice: string;
    maxPrice: string;
    averagePrice: string;
  };
  selectedPoint?: string | null;
  patternPoint?: string | null;
  showButtons?: boolean;
  showChart?: boolean;
}

// Hook pour utiliser le contexte du filtre
function useFilter() {
  return useContext(FilterContext);
}

// Composant wrapper qui fournit le contexte
export function ChartWithFiltersProvider({ children }: { children: React.ReactNode }) {
  const [selectedFilter, setSelectedFilter] = useState<PointFilter>('all');

  return (
    <FilterContext.Provider value={{ selectedFilter, setSelectedFilter }}>
      {children}
    </FilterContext.Provider>
  );
}

export default function ChartWithFilters({
  allPoints,
  redPoints = null,
  greenPoints = null,
  analysis,
  selectedPoint = null,
  patternPoint = null,
  showButtons = true,
  showChart = true
}: ChartWithFiltersProps) {
  const { selectedFilter, setSelectedFilter } = useFilter();

  // Sélectionner les points à afficher selon le filtre
  const getFilteredPoints = () => {
    switch (selectedFilter) {
      case 'red':
        return redPoints || [];
      case 'green':
        return greenPoints || [];
      case 'all':
      default:
        return allPoints;
    }
  };

  const filteredPoints = getFilteredPoints();

  return (
    <>
      {/* Boutons de filtrage */}
      {showButtons && (
        <HStack gap={3} align="center">
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Points displayed:
          </Text>
          <HStack gap={2}>
            <Button
              size="sm"
              variant={selectedFilter === 'all' ? 'solid' : 'outline'}
              colorPalette={selectedFilter === 'all' ? 'blue' : 'gray'}
              onClick={() => setSelectedFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={selectedFilter === 'red' ? 'solid' : 'outline'}
              colorPalette={selectedFilter === 'red' ? 'red' : 'gray'}
              onClick={() => setSelectedFilter('red')}
              isDisabled={!redPoints || redPoints.length === 0}
            >
              Red
            </Button>
            <Button
              size="sm"
              variant={selectedFilter === 'green' ? 'solid' : 'outline'}
              colorPalette={selectedFilter === 'green' ? 'green' : 'gray'}
              onClick={() => setSelectedFilter('green')}
              isDisabled={!greenPoints || greenPoints.length === 0}
            >
              Green
            </Button>
          </HStack>
        </HStack>
      )}

      {/* Graphique avec les points filtrés */}
      {showChart && (
        <SegmentChart
          pointsData={filteredPoints}
          allPointsData={allPoints}
          analysis={analysis}
          selectedPoint={selectedPoint}
          patternPoint={patternPoint}
        />
      )}
    </>
  );
}

