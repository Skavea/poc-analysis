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
import { Box, Text, Heading, Button, HStack, Spacer } from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SlideshowPageProps {
  params: Promise<{ symbol: string }>;
}

async function fetchSegments(symbol: string): Promise<AnalysisResult[]> {
  const segments = await DatabaseService.getAnalysisResults(symbol);
  return segments;
}

export default function SlideshowPage({ params }: SlideshowPageProps) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol;
  
  const segments = use(fetchSegments(symbol));
  
  if (!segments || segments.length === 0) {
    return (
      <Navigation
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analysis', href: `/analysis/${symbol}` },
          { label: 'Slideshow' }
        ]}
        pageTitle="No Segments Found"
        pageSubtitle={`No segments available for ${symbol}`}
      >
        <Box textAlign="center" py={12}>
          <Heading size="md" mb={4}>No segments found for {symbol}</Heading>
          <Text mb={6}>Please run analysis first to generate segments.</Text>
          <Link href={`/analysis/${symbol}`} passHref>
            <Button colorPalette="blue" leftIcon={<ArrowLeft size={16} />}>
              Return to Analysis
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
  
  return (
    <Navigation
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Analysis', href: `/analysis/${symbol}` },
        { label: 'Slideshow' }
      ]}
      pageTitle={`${symbol} Classification Slideshow`}
      pageSubtitle={`Review and classify segments (${classified}/${total} classified - ${progress}%)`}
      pageActions={
        <Link href={`/analysis/${symbol}`} passHref>
          <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
            Back to Analysis
          </Button>
        </Link>
      }
    >
      <SegmentSlideshow segments={segments} symbol={symbol} />
    </Navigation>
  );
}
