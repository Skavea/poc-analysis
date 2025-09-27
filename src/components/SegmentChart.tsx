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
import { BarChart3, Download } from 'lucide-react';
import { Box, VStack, HStack, Text, Heading, Button } from '@chakra-ui/react';

interface SegmentChartProps {
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
  // Props pour la sélection de points
  selectedPoint?: string | null;
  patternPoint?: string | null;
}

export default function SegmentChart({ 
  pointsData, 
  analysis,
  selectedPoint = null,
  patternPoint = null
}: SegmentChartProps) {
  // Function to export chart as SVG
  const exportChartAsSVG = () => {
    try {
      // Find the SVG element in the component
      const svgElement = document.querySelector('.recharts-wrapper svg');
      if (!svgElement) {
        throw new Error('SVG element not found');
      }
      
      // Clone the SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Set proper dimensions and namespaces
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('width', svgElement.clientWidth.toString());
      svgClone.setAttribute('height', svgElement.clientHeight.toString());
      
      // Convert SVG to string
      const svgString = new XMLSerializer().serializeToString(svgClone);
      
      // Create a blob and download link
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart-${analysis.x0}-${new Date().toISOString()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Chart exported successfully!');
      
    } catch (error) {
      console.error('Error exporting SVG:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
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

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { timestamp: string } }) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    
    const isLastPoint = payload.timestamp === pointsData[pointsData.length - 1]?.timestamp;
    const isSelectedPoint = selectedPoint === payload.timestamp;
    const isPatternPoint = patternPoint === payload.timestamp;
    
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
  
  // Calculate Y-axis domain with percentage-based padding (7%)
  const priceRange = maxPrice - minPrice;
  const paddingPercentage = 0.07; // 7% padding
  const padding = priceRange * paddingPercentage;
  const yAxisMin = minPrice - padding;
  const yAxisMax = maxPrice + padding;

  return (
    <Box height="24rem" position="relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pointsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            angle={-45}
            textAnchor="end"
            height={60}
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
            strokeWidth={2}
            dot={<CustomDot />}
          />
        </LineChart>
      </ResponsiveContainer>

      
      {/* Legend */}
      <HStack mt={4} justify="space-between" align="center">
        <Box display="flex" flexWrap="wrap" gap={4} fontSize="sm">
        <HStack gap={2}>
          <Box width="12px" height="12px" bg="blue.500" rounded="full" />
          <Text>Price</Text>
        </HStack>
        <HStack gap={2}>
          <Box width="12px" height="12px" bg="red.500" rounded="full" />
          <Text>x0 (Last Point)</Text>
        </HStack>
        {selectedPoint && (
          <HStack gap={2}>
            <Box width="12px" height="12px" bg="purple.500" rounded="full" />
            <Text>Selected Point</Text>
          </HStack>
        )}
        {patternPoint && (
          <HStack gap={2}>
            <Box width="12px" height="12px" bg="#eab308" rounded="full" />
            <Text>Pattern Origin</Text>
          </HStack>
        )}
        <HStack gap={2}>
          <Box width="12px" height="4px" bg="purple.500" />
          <Text>Average</Text>
        </HStack>
        <HStack gap={2}>
          <Box width="12px" height="4px" bg="red.500" />
          <Text>Min</Text>
        </HStack>
        <HStack gap={2}>
          <Box width="12px" height="4px" bg="green.500" />
          <Text>Max</Text>
        </HStack>
        </Box>
        
        <Button
          size="sm"
          colorPalette="blue"
          variant="outline"
          onClick={exportChartAsSVG}
        >
          <Download size={14} style={{ marginRight: '8px' }} />
          Export SVG
        </Button>
      </HStack>
    </Box>
  );
}