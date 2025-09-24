'use client';

/**
 * Segment Slideshow Component
 * ==========================
 * 
 * A PowerPoint-like slideshow interface for reviewing segments
 * Allows users to navigate between segments and classify them as R or V
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisResult } from '@/lib/schema';
import SegmentChart from './SegmentChart';
import { 
  Box, 
  Card, 
  Grid, 
  GridItem, 
  VStack, 
  HStack, 
  Text, 
  Badge, 
  Button, 
  ButtonGroup,
  Heading
} from '@chakra-ui/react';
import { Progress } from '@/components/ui/Progress';
import { toast } from '@/components/ui/toaster';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  AlignJustify,
  Check,
  X
} from 'lucide-react';

interface SegmentSlideshowProps {
  segments: AnalysisResult[];
  symbol: string;
}

export default function SegmentSlideshow({ segments, symbol }: SegmentSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const currentSegment = segments[currentIndex];
  
  // Calculate progress
  const classified = segments.filter(s => s.schemaType !== 'UNCLASSIFIED').length;
  const total = segments.length;
  const progress = Math.round((classified / total) * 100);
  
  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, segments.length]);
  
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'r' || e.key === 'R') {
        classifySegment('R');
      } else if (e.key === 'v' || e.key === 'V') {
        classifySegment('V');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);
  
  // Classification function
  const classifySegment = async (schemaType: 'R' | 'V' | 'UNCLASSIFIED') => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/update-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentId: currentSegment.id,
          schemaType
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update segment classification');
      }
      
      // Update the segment in the local state
      segments[currentIndex] = {
        ...currentSegment,
        schemaType
      };
      
      toast({
        title: 'Classification updated',
        description: `Segment classified as ${schemaType}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      // Move to next segment automatically
      if (currentIndex < segments.length - 1) {
        setTimeout(() => {
          goToNext();
        }, 500);
      }
      
      // Refresh the page data
      router.refresh();
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update classification',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Error updating schema:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!currentSegment) {
    return <Box>No segments available</Box>;
  }
  
  // Format the segment data for the chart
  const pointsData = Array.isArray(currentSegment.pointsData) 
    ? currentSegment.pointsData 
    : [];
  
  return (
    <Box>
      {/* Progress bar */}
      <Box mb={4}>
        <HStack mb={2}>
          <Text fontSize="sm" fontWeight="medium">Classification Progress:</Text>
          <Text fontSize="sm" fontWeight="bold">{classified}/{total} ({progress}%)</Text>
        </HStack>
        <Progress value={progress} size="sm" colorPalette="blue" borderRadius="md" />
      </Box>
      
      {/* Slideshow navigation */}
      <HStack mb={4} justify="space-between">
        <Button 
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          variant="outline"
        >
          <HStack gap={2}>
            <ChevronLeft size={16} />
            <Text>Previous</Text>
          </HStack>
        </Button>
        
        <Text fontSize="sm">
          Segment {currentIndex + 1} of {segments.length}
        </Text>
        
        <Button 
          onClick={goToNext}
          disabled={currentIndex === segments.length - 1}
          variant="outline"
        >
          <HStack gap={2}>
            <Text>Next</Text>
            <ChevronRight size={16} />
          </HStack>
        </Button>
      </HStack>
      
      {/* Main content */}
      <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap={6}>
        {/* Left: Chart */}
        <GridItem>
          <Card.Root>
            <Card.Header pb={4}>
              <HStack justify="space-between">
                <Heading size="md">Price Chart</Heading>
                <Badge 
                  colorPalette={currentSegment.trendDirection === 'UP' ? 'green' : 'red'} 
                  variant="subtle"
                >
                  {currentSegment.trendDirection}
                </Badge>
              </HStack>
            </Card.Header>
            <Card.Body pt={0}>
              <SegmentChart 
                pointsData={pointsData} 
                analysis={{
                  ...currentSegment,
                  // Exclude pointsData from analysis to avoid type error
                  x0: currentSegment.x0,
                  minPrice: currentSegment.minPrice,
                  maxPrice: currentSegment.maxPrice,
                  averagePrice: currentSegment.averagePrice
                }} 
              />
            </Card.Body>
          </Card.Root>
        </GridItem>
        
        {/* Right: Classification and Info */}
        <GridItem>
          <VStack gap={6} align="stretch">
            {/* Classification card */}
            <Card.Root>
              <Card.Header pb={4}>
                <Heading size="md">Classify This Segment</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack gap={4} align="stretch">
                  <Text fontSize="sm" color="fg.muted">
                    Current classification: 
                    <Badge 
                      ml={2}
                      colorPalette={
                        currentSegment.schemaType === 'R' ? 'red' :
                        currentSegment.schemaType === 'V' ? 'purple' : 'gray'
                      }
                      variant="subtle"
                    >
                      {currentSegment.schemaType === 'UNCLASSIFIED' ? 'Unclassified' : currentSegment.schemaType}
                    </Badge>
                  </Text>
                  
                  <Box>
                    <Text fontSize="sm" mb={2}>Select classification:</Text>
                    <HStack width="100%" gap={0}>
                      <Button 
                        colorPalette={currentSegment.schemaType === 'R' ? 'red' : 'gray'}
                        variant={currentSegment.schemaType === 'R' ? 'solid' : 'outline'}
                        onClick={() => classifySegment('R')}
                        flex={1}
                        loading={loading && currentSegment.schemaType !== 'R'}
                        borderRightRadius={0}
                        borderRight="0"
                      >
                        <HStack gap={2}>
                          <Check size={16} />
                          <Text>R Schema</Text>
                        </HStack>
                      </Button>
                      <Button 
                        colorPalette={currentSegment.schemaType === 'V' ? 'purple' : 'gray'}
                        variant={currentSegment.schemaType === 'V' ? 'solid' : 'outline'}
                        onClick={() => classifySegment('V')}
                        flex={1}
                        loading={loading && currentSegment.schemaType !== 'V'}
                        borderLeftRadius={0}
                      >
                        <HStack gap={2}>
                          <Check size={16} />
                          <Text>V Schema</Text>
                        </HStack>
                      </Button>
                    </HStack>
                  </Box>
                  
                  <Box>
                    <Button 
                      variant="outline" 
                      colorPalette="gray" 
                      width="100%" 
                      onClick={() => classifySegment('UNCLASSIFIED')}
                      loading={loading && currentSegment.schemaType === 'UNCLASSIFIED'}
                    >
                      <HStack gap={2}>
                        <X size={16} />
                        <Text>Reset Classification</Text>
                      </HStack>
                    </Button>
                  </Box>
                  
                  <Box mt={2} p={3} bg="bg.subtle" borderRadius="md">
                    <Text fontSize="xs" color="fg.muted">
                      <strong>Keyboard shortcuts:</strong><br />
                      • Left/Right arrows: Navigate between segments<br />
                      • &quot;R&quot; key: Classify as R Schema<br />
                      • &quot;V&quot; key: Classify as V Schema
                    </Text>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
            
            {/* Segment info */}
            <Card.Root>
              <Card.Header pb={4}>
                <Heading size="md">Segment Details</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack gap={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">Date</Text>
                    <Text fontSize="sm">{currentSegment.date}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">Time Range</Text>
                    <Text fontSize="sm">
                      {formatTime(currentSegment.segmentStart.toString())} - {formatTime(currentSegment.segmentEnd.toString())}
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">Points</Text>
                    <Text fontSize="sm">{currentSegment.pointCount}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                      Points in {currentSegment.trendDirection} Region
                    </Text>
                    <Text fontSize="sm">{currentSegment.pointsInRegion || '-'}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">x0</Text>
                    <Text fontSize="sm" fontWeight="semibold">${Number(currentSegment.x0).toFixed(2)}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium" color="fg.muted">Average</Text>
                    <Text fontSize="sm">${Number(currentSegment.averagePrice).toFixed(2)}</Text>
                  </HStack>
                </VStack>
              </Card.Body>
            </Card.Root>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );
}

// Helper function to format time
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
