/**
 * Client Component: Segment Chart
 * ===============================
 * 
 * Client-side chart component for segment visualization
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Box, VStack, HStack, Text, Heading } from '@chakra-ui/react';

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
}

export default function SegmentChart({ pointsData, analysis }: SegmentChartProps) {
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

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload && payload.timestamp === pointsData[pointsData.length - 1]?.timestamp) {
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
    return null;
  };

  const minPrice = Number(analysis.minPrice);
  const maxPrice = Number(analysis.maxPrice);
  const averagePrice = Number(analysis.averagePrice);
  const x0Price = Number(analysis.x0);

  return (
    <Box height="24rem">
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
            domain={['dataMin - 1', 'dataMax + 1']}
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
            label={{ value: "Average", position: "topRight" }}
          />
          <ReferenceLine 
            y={minPrice} 
            stroke="#ef4444" 
            strokeDasharray="3 3"
            label={{ value: "Min", position: "topRight" }}
          />
          <ReferenceLine 
            y={maxPrice} 
            stroke="#10b981" 
            strokeDasharray="3 3"
            label={{ value: "Max", position: "topRight" }}
          />
          
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={<CustomDot />}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <Box mt={4} display="flex" flexWrap="wrap" gap={4} fontSize="sm">
        <HStack gap={2}>
          <Box width="12px" height="12px" bg="blue.500" rounded="full" />
          <Text>Price</Text>
        </HStack>
        <HStack gap={2}>
          <Box width="12px" height="12px" bg="red.500" rounded="full" />
          <Text>x0 (Last Point)</Text>
        </HStack>
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
    </Box>
  );
}