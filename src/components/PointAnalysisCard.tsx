/**
 * Point Analysis Card
 * ==================
 * 
 * Displays the point analysis information for a segment
 * Shows original points, points in region, red points, green points, and final points
 */

import { Card, VStack, HStack, Text, Badge, Box } from "@chakra-ui/react";
import { AnalysisResultWithChart } from "@/lib/schema";

interface PointAnalysisCardProps {
  analysis: AnalysisResultWithChart;
}

export default function PointAnalysisCard({ analysis }: PointAnalysisCardProps) {
  
  return (
    <Card.Root>
      <Card.Header pb={4}>
        <Text fontSize="lg" fontWeight="bold" color="fg.default">
          Point Analysis
        </Text>
      </Card.Header>
      <Card.Body pt={0}>
        <VStack gap={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              Total Dataset Points
            </Text>
            <Text fontSize="sm" color="fg.default" fontWeight="semibold">
              {analysis.pointCount}
            </Text>
          </HStack>
          
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              Points in {analysis.trendDirection} Region
            </Text>
            <HStack>
              <Text fontSize="sm" color="fg.default" fontWeight="semibold">
                {analysis.pointsInRegion || '-'}
              </Text>
              <Badge 
                colorPalette={
                  !analysis.pointsInRegion ? 'gray' :
                  analysis.pointsInRegion < 6 ? 'yellow' :
                  analysis.pointsInRegion > 21 ? 'yellow' : 
                  'green'
                } 
                variant="subtle" 
                size="sm"
              >
                {!analysis.pointsInRegion ? 'Unknown' :
                 analysis.pointsInRegion < 6 ? 'Low' :
                 analysis.pointsInRegion > 21 ? 'High' : 
                 'Optimal'}
              </Badge>
            </HStack>
          </HStack>

          <HStack justify="space-between">
            <HStack gap={2}>
              <Box width="8px" height="8px" bg="red.500" rounded="full" />
              <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                Red Points
              </Text>
            </HStack>
            <Text fontSize="sm" color="red.600" fontWeight="semibold">
              {analysis.redPointCount ?? '-'}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <HStack gap={2}>
              <Box width="8px" height="8px" bg="green.500" rounded="full" />
              <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                Green Points
              </Text>
            </HStack>
            <Text fontSize="sm" color="green.600" fontWeight="semibold">
              {analysis.greenPointCount ?? '-'}
            </Text>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}