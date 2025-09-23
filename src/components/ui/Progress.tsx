/**
 * Progress Indicator Component
 * ===========================
 * 
 * Custom progress component using Chakra UI v3
 * Shows loading states and progress
 */

'use client';

import { Box, Text, HStack } from '@chakra-ui/react';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  colorPalette?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function Progress({ 
  value, 
  max = 100, 
  size = 'md',
  colorPalette = 'blue',
  showLabel = false,
  label,
  className = ''
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeStyles = {
    sm: { height: '4px', fontSize: 'xs' },
    md: { height: '6px', fontSize: 'sm' },
    lg: { height: '8px', fontSize: 'md' },
  };

  return (
    <Box className={`animate-fade-in ${className}`}>
      {showLabel && (
        <HStack justify="space-between" mb={2}>
          <Text fontSize={sizeStyles[size].fontSize} color="fg.muted">
            {label || 'Progress'}
          </Text>
          <Text fontSize={sizeStyles[size].fontSize} color="fg.default" fontWeight="medium">
            {Math.round(percentage)}%
          </Text>
        </HStack>
      )}
      
      <Box
        w="100%"
        h={sizeStyles[size].height}
        bg="bg.subtle"
        rounded="full"
        overflow="hidden"
      >
        <Box
          h="100%"
          bg={`${colorPalette}.500`}
          rounded="full"
          transition="width 0.3s ease"
          style={{ width: `${percentage}%` }}
          className="animate-scale-in"
        />
      </Box>
    </Box>
  );
}

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  colorPalette?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function CircularProgress({ 
  value, 
  max = 100, 
  size = 40,
  colorPalette = 'blue',
  showLabel = false,
  label,
  className = ''
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Box className={`animate-scale-in ${className}`}>
      <Box position="relative" display="inline-block">
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--chakra-colors-bg-subtle)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`var(--chakra-colors-${colorPalette}-500)`}
            strokeWidth="2"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transition="stroke-dashoffset 0.3s ease"
          />
        </svg>
        
        {showLabel && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            textAlign="center"
          >
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              {label || `${Math.round(percentage)}%`}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
