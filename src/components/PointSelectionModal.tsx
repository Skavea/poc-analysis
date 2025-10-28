/**
 * Client Component: Point Selection Modal
 * ======================================
 * 
 * Simple fullscreen modal for point selection on chart
 */

'use client';

import { useState } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  VStack, 
  HStack,
} from "@chakra-ui/react";
import { 
  X, 
  Target
} from 'lucide-react';
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

interface PointSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPointSelect: (timestamp: string) => void;
  pointsData: Array<{
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
}

export default function PointSelectionModal({ 
  isOpen, 
  onClose, 
  onPointSelect,
  pointsData,
  analysis
}: PointSelectionModalProps) {
  if (!isOpen) return null;

  const minPrice = Number(analysis.minPrice);
  const maxPrice = Number(analysis.maxPrice);
  const averagePrice = Number(analysis.averagePrice);
  
  // Calculate Y-axis domain with percentage-based padding (7%)
  const priceRange = maxPrice - minPrice;
  const paddingPercentage = 0.07;
  const padding = priceRange * paddingPercentage;
  const yAxisMin = minPrice - padding;
  const yAxisMax = maxPrice + padding;

  // Custom dot with click handler - zone cliquable agrandie
  const ClickableDot = (props: { cx?: number; cy?: number; payload?: { timestamp: string } }) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    
    const isLastPoint = payload.timestamp === pointsData[pointsData.length - 1]?.timestamp;
    const clickRadius = 15; // Zone cliquable invisible plus grande
    
    // Dernier point (X0) - plus grand
    if (isLastPoint) {
      return (
        <g>
          {/* Zone cliquable invisible plus grande */}
          <circle
            cx={cx}
            cy={cy}
            r={clickRadius}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => onPointSelect(payload.timestamp)}
          />
          {/* Point visible */}
          <Dot
            cx={cx}
            cy={cy}
            r={10}
            fill="#ef4444"
            stroke="#dc2626"
            strokeWidth={3}
          />
        </g>
      );
    }
    
    // Points normaux - cliquables avec zone agrandie
    return (
      <g>
        {/* Zone cliquable invisible plus grande */}
        <circle
          cx={cx}
          cy={cy}
          r={clickRadius}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onPointSelect(payload.timestamp)}
        />
        {/* Point visible */}
        <Dot
          cx={cx}
          cy={cy}
          r={8}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={2}
        />
      </g>
    );
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      bg="rgba(0, 0, 0, 0.9)"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <Box
        bg="white"
        p={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        _dark={{ bg: "gray.800", borderColor: "gray.700" }}
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <Target size={24} color="var(--chakra-colors-blue-500)" />
            <VStack align="start" gap={0}>
              <Text fontSize="lg" fontWeight="medium">
                Sélectionner un point
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Cliquez sur un point du graphique pour le sélectionner
              </Text>
            </VStack>
          </HStack>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X size={20} />
          </Button>
        </HStack>
      </Box>

      {/* Chart */}
      <Box flex={1} p={6}>
        <Box height="100%" bg="white" rounded="lg" p={4} _dark={{ bg: "gray.800" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pointsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => {
                  // Formate l'heure sans décalage horaire en utilisant les valeurs UTC
                  const date = new Date(value);
                  const hours = date.getUTCHours().toString().padStart(2, '0');
                  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                  return `${hours}:${minutes}`;
                }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                domain={[yAxisMin, yAxisMax]}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleString()}
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
                strokeWidth={3}
                dot={<ClickableDot />}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  );
}
