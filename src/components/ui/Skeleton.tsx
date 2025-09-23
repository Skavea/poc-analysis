/**
 * Skeleton Loading Component
 * =========================
 * 
 * Custom skeleton component using Chakra UI v3
 * Provides loading states for better UX
 */

'use client';

import { Box, VStack, HStack } from '@chakra-ui/react';

interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  rounded?: string;
  className?: string;
}

export function Skeleton({ 
  height = '20px', 
  width = '100%', 
  rounded = 'md',
  className = ''
}: SkeletonProps) {
  return (
    <Box
      height={height}
      width={width}
      rounded={rounded}
      bg="bg.subtle"
      className={`animate-pulse ${className}`}
    />
  );
}

// Predefined skeleton components
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <VStack gap={2} className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          height="16px" 
          width={i === lines - 1 ? '75%' : '100%'} 
          className="animate-pulse"
        />
      ))}
    </VStack>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <Box
      p={6}
      bg="bg.default"
      rounded="lg"
      border="1px"
      borderColor="border.default"
      className={`animate-fade-in ${className}`}
    >
      <VStack gap={4}>
        <Skeleton height="24px" width="60%" />
        <SkeletonText lines={2} />
        <HStack gap={2}>
          <Skeleton height="32px" width="80px" />
          <Skeleton height="32px" width="100px" />
        </HStack>
      </VStack>
    </Box>
  );
}
