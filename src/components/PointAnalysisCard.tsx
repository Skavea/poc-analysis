/**
 * Point Analysis Card
 * ==================
 * 
 * Displays the point analysis information for a segment
 * Shows original points, points in region, and final points
 */

import { Card, VStack, HStack, Text, Badge, Box } from "@chakra-ui/react";
import { AnalysisResultWithChart } from "@/lib/schema";

interface PointAnalysisCardProps {
  analysis: AnalysisResultWithChart;
}

export default function PointAnalysisCard({ analysis }: PointAnalysisCardProps) {
  const hasAdjustment = analysis.originalPointCount !== analysis.pointCount;
  
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
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}