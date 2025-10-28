/**
 * Client Component: Segment Chart
 * ===============================
 * 
 * Client-side chart component for segment visualization
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { BarChart3 } from 'lucide-react';
import { Box, VStack, Text, Heading } from '@chakra-ui/react';

interface SegmentChartProps {
  pointsData: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  // Toutes les données pour maintenir les mêmes échelles X et Y
  allPointsData?: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  analysis: {
    x0: string;
    minPrice: string;
    maxPrice: string;
    averagePrice: string;
  };
  // Props pour la sélection de points
  selectedPoint?: string | null;
  patternPoint?: string | null;
}

export default function SegmentChart({ 
  pointsData, 
  allPointsData,
  analysis,
  selectedPoint = null,
  patternPoint = null
}: SegmentChartProps) {
  // Utiliser allPointsData si disponible pour maintenir les mêmes échelles, sinon utiliser pointsData
  const basePointsData = allPointsData || pointsData;
  
  if (!pointsData || pointsData.length === 0) {
    return (
      <Box height="24rem" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={2} textAlign="center">
          <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
          <Heading size="sm" color="fg.default">Chart not available</Heading>
        </VStack>
      </Box>
    );
  }

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { timestamp: number; originalTimestamp?: string } }) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    
    // Utiliser le timestamp original pour les comparaisons s'il existe, sinon convertir depuis le nombre
    const payloadTimestamp = (payload as any).originalTimestamp || new Date(payload.timestamp).toISOString();
    const lastPointTimestamp = pointsData[pointsData.length - 1]?.timestamp;
    
    // Vérifier si c'est le dernier point dans les points affichés (filtered)
    const isLastPoint = payloadTimestamp === lastPointTimestamp;
    const isSelectedPoint = selectedPoint === payloadTimestamp;
    const isPatternPoint = patternPoint === payloadTimestamp;
    
    // Point pattern (jaune)
    if (isPatternPoint) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={8}
          fill="#eab308"
          stroke="#ca8a04"
          strokeWidth={3}
        />
      );
    }
    
    // Point sélectionné (pattern)
    if (isSelectedPoint) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={8}
          fill="#8b5cf6"
          stroke="#6d28d9"
          strokeWidth={3}
        />
      );
    }
    
    // Dernier point (X0)
    if (isLastPoint) {
      return (
        <Dot
          cx={cx}
          cy={cy}
          r={6}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={2}
        />
      );
    }
    
    // Points normaux
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={3}
        fill="#94a3b8"
        stroke="#64748b"
        strokeWidth={1}
      />
    );
  };

  const minPrice = Number(analysis.minPrice);
  const maxPrice = Number(analysis.maxPrice);
  const averagePrice = Number(analysis.averagePrice);
  
  // Calculer le domaine X basé sur toutes les données pour maintenir la même échelle X
  // Convertir les timestamps en nombres pour le domaine
  const allTimestamps = basePointsData.map(p => new Date(p.timestamp).getTime());
  const minTimestamp = Math.min(...allTimestamps);
  const maxTimestamp = Math.max(...allTimestamps);
  
  // Pour le graphique, utiliser uniquement les points filtrés pour que les lignes soient tracées correctement
  // Les points seront positionnés selon leur timestamp réel, mais l'axe X montrera tous les timestamps
  // Convertir les timestamps en nombres (millisecondes) pour que Recharts puisse les utiliser avec type="number"
  // Conserver aussi le timestamp original pour les comparaisons
  const chartData = pointsData.map(point => ({
    ...point,
    timestamp: new Date(point.timestamp).getTime() as any, // Convertir en nombre pour l'axe X
    originalTimestamp: point.timestamp // Conserver le timestamp original pour les comparaisons
  }));

  // Calculate Y-axis domain with percentage-based padding (7%)
  // Toujours basé sur toutes les données pour maintenir la même échelle Y
  const priceRange = maxPrice - minPrice;
  const paddingPercentage = 0.07; // 7% padding
  const padding = priceRange * paddingPercentage;
  const yAxisMin = minPrice - padding;
  const yAxisMax = maxPrice + padding;

  return (
    <Box height="24rem" position="relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => {
              // Le value peut être un nombre (timestamp) ou une string
              // Formate l'heure sans décalage horaire en utilisant les valeurs UTC
              const date = typeof value === 'number' ? new Date(value) : new Date(value);
              const hours = date.getUTCHours().toString().padStart(2, '0');
              const minutes = date.getUTCMinutes().toString().padStart(2, '0');
              return `${hours}:${minutes}`;
            }}
            angle={-45}
            textAnchor="end"
            height={60}
            // Définir le domaine X pour couvrir tous les timestamps (toutes les données)
            // Cela maintient la même échelle X même si on affiche moins de points
            domain={[minTimestamp, maxTimestamp]}
            type="number"
            // Permettre le débordement pour afficher tous les timestamps sur l'axe
            allowDataOverflow={true}
          />
          <YAxis 
            domain={[yAxisMin, yAxisMax]}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip 
            labelFormatter={(value) => {
              // Le value peut être un nombre (timestamp) ou une string
              const date = typeof value === 'number' ? new Date(value) : new Date(value);
              return date.toLocaleString();
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          
          {/* Reference lines */}
          <ReferenceLine 
            y={averagePrice} 
            stroke="#8b5cf6" 
            strokeDasharray="5 5"
            label={{ value: "Average", position: "top" }}
          />
          <ReferenceLine 
            y={minPrice} 
            stroke="#ef4444" 
            strokeDasharray="3 3"
            label={{ value: "Min", position: "top" }}
          />
          <ReferenceLine 
            y={maxPrice} 
            stroke="#10b981" 
            strokeDasharray="3 3"
            label={{ value: "Max", position: "top" }}
          />
          
          <Line 
            type="linear" 
            dataKey="close" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={<CustomDot />}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

    </Box>
  );
}