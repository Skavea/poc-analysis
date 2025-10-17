/**
 * Slideshow View
 * =============
 * 
 * A PowerPoint-like interface for reviewing and classifying segments sequentially
 * Allows users to efficiently go through all segments of a stock and classify them as R or V
 */

import { use } from 'react';
import { DatabaseService } from '@/lib/db';
import { AnalysisResult } from '@/lib/schema';
import Navigation from '@/components/layout/Navigation';
import SegmentSlideshow from '@/components/SegmentSlideshow';
import { Box, Text, Heading, Button, HStack } from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SlideshowPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ stream?: string }>;
}

async function fetchSegments(symbol: string, streamId?: string): Promise<AnalysisResult[]> {
  if (streamId) {
    return await DatabaseService.getAnalysisResultsByStreamId(streamId);
  }
  
  return await DatabaseService.getAnalysisResults(symbol);
}

export default function SlideshowPage({ params, searchParams }: SlideshowPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const symbol = resolvedParams.symbol;
  const streamId = resolvedSearchParams.stream;
  
  const segments = use(fetchSegments(symbol, streamId));
  
  // Déterminer les breadcrumbs selon qu'un stream est sélectionné ou non
  const breadcrumbs = streamId 
    ? [
        { label: `${symbol} Streams`, href: `/streams/${symbol}` },
        { label: 'Analysis', href: `/analysis/${symbol}?stream=${streamId}` },
        { label: 'Slideshow' }
      ]
    : [
        { label: 'Analysis', href: `/analysis/${symbol}` },
        { label: 'Slideshow' }
      ];

  if (!segments || segments.length === 0) {
    const backUrl = streamId ? `/streams/${symbol}` : `/analysis/${symbol}`;
    
    return (
      <Navigation
        breadcrumbs={breadcrumbs}
        pageTitle="No Segments Found"
        pageSubtitle={`No segments available for ${symbol}${streamId ? ` (Stream ${streamId.split('_')[1]})` : ''}`}
      >
        <Box textAlign="center" py={12}>
          <Heading size="md" mb={4}>No segments found for {symbol}</Heading>
          <Text mb={6}>Please run analysis first to generate segments.</Text>
          <Link href={backUrl} passHref>
            <Button colorPalette="blue">
              <HStack gap={2}>
                <ArrowLeft size={16} />
                <Text>Return to {streamId ? 'Streams' : 'Analysis'}</Text>
              </HStack>
            </Button>
          </Link>
        </Box>
      </Navigation>
    );
  }
  
  // Count classified vs unclassified segments
  const classified = segments.filter(s => s.schemaType !== 'UNCLASSIFIED').length;
  const total = segments.length;
  const progress = Math.round((classified / total) * 100);
  
  const pageTitle = streamId 
    ? `${symbol} Classification Slideshow (Stream ${streamId.split('_')[1]})`
    : `${symbol} Classification Slideshow`;

  const pageSubtitle = streamId 
    ? `Review and classify stream segments (${classified}/${total} classified - ${progress}%)`
    : `Review and classify all segments (${classified}/${total} classified - ${progress}%)`;

  const backUrl = streamId ? `/analysis/${symbol}?stream=${streamId}` : `/analysis/${symbol}`;

  return (
    <Navigation
      breadcrumbs={breadcrumbs}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      pageActions={
        <Link href={backUrl} passHref>
          <Button variant="outline">
            <HStack gap={2}>
              <ArrowLeft size={16} />
              <Text>Back to Analysis</Text>
            </HStack>
          </Button>
        </Link>
      }
    >
      <SegmentSlideshow segments={segments} symbol={symbol} />
    </Navigation>
  );
}
