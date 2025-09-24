'use client';

/**
 * Custom Progress Component for Chakra UI v3
 * =========================================
 * 
 * A simple progress bar component that works with Chakra UI v3
 */

import { Box } from '@chakra-ui/react';
import { CSSProperties } from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  colorPalette?: string;
  borderRadius?: string;
}

export function Progress({ 
  value, 
  max = 100, 
  size = 'md', 
  colorPalette = 'blue', 
  borderRadius = 'md' 
}: ProgressProps) {
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Size mapping
  const sizeMap = {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem'
  };
  
  const height = sizeMap[size] || sizeMap.md;
  
  return (
    <Box
      position="relative"
      height={height}
      width="100%"
      bg="bg.subtle"
      borderRadius={borderRadius}
      overflow="hidden"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        height="100%"
        width={`${percentage}%`}
        bg={`${colorPalette}.500`}
        transition="width 0.3s ease-in-out"
        borderRadius={borderRadius}
      />
    </Box>
  );
}