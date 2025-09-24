'use client';

/**
 * Stored Chart Image Component
 * ===========================
 * 
 * Component for displaying charts stored in the database
 */

import { useState, useEffect } from 'react';
import { Box, VStack, Button, Text, Spinner, HStack } from '@chakra-ui/react';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { generateAndSaveChart, getChartUrl } from '@/lib/chartUtils';

interface StoredChartImageProps {
  segmentId: string;
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
}

export default function StoredChartImage({
  segmentId,
  width = 800,
  height = 400,
  className = '',
  showControls = true,
}: StoredChartImageProps) {
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chart image on mount
  useEffect(() => {
    setChartUrl(getChartUrl(segmentId));
  }, [segmentId]);

  // Function to regenerate the chart
  const handleRegenerateChart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Generate and save a new chart
      await generateAndSaveChart(segmentId);
      
      // Get the new chart URL (with cache buster)
      setChartUrl(`${getChartUrl(segmentId)}?t=${Date.now()}`);
    } catch (err) {
      console.error('Failed to regenerate chart:', err);
      setError('Failed to regenerate chart');
    } finally {
      setLoading(false);
    }
  };

  // Function to download the chart
  const handleDownloadChart = () => {
    if (!chartUrl) return;
    
    // Open in new tab
    window.open(chartUrl, '_blank');
  };

  if (error) {
    return (
      <VStack gap={4} className={className}>
        <Box p={4} border="1px solid" borderColor="red.300" bg="red.50" borderRadius="md" width="100%">
          <Text color="red.500">{error}</Text>
        </Box>
        <Button onClick={() => setChartUrl(getChartUrl(segmentId))} leftIcon={<RefreshCw size={16} />}>
          Try Again
        </Button>
      </VStack>
    );
  }

  return (
    <VStack gap={4} className={className}>
      <Box position="relative" width="100%" height={`${height}px`} border="1px solid" borderColor="gray.200" borderRadius="md">
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Spinner size="lg" color="blue.500" />
          </Box>
        ) : !chartUrl ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <VStack gap={4}>
              <BarChart3 size={48} color="var(--chakra-colors-gray-400)" />
              <Text>No chart available</Text>
              <Button onClick={handleRegenerateChart} colorPalette="blue">
                Generate Chart
              </Button>
            </VStack>
          </Box>
        ) : (
          <Box
            as="img"
            src={chartUrl}
            alt={`Chart for segment ${segmentId}`}
            width="100%"
            height="100%"
            objectFit="contain"
          />
        )}
      </Box>
      
      {showControls && chartUrl && (
        <HStack gap={4} justify="flex-end" width="100%">
          <Button
            size="sm"
            onClick={handleRegenerateChart}
            leftIcon={<RefreshCw size={16} />}
            isLoading={loading}
            loadingText="Regenerating"
            colorPalette="blue"
            variant="outline"
          >
            Regenerate
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadChart}
            leftIcon={<Download size={16} />}
            colorPalette="green"
            variant="outline"
          >
            Download
          </Button>
        </HStack>
      )}
    </VStack>
  );
}
