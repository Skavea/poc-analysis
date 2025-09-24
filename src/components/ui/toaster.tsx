'use client';

/**
 * Toaster Component
 * ================
 * 
 * Centralized toast notification system for Chakra UI v3
 */

import { createToaster } from '@chakra-ui/react';

// Create and export the Toaster component and toast function
export const { Toaster, toast } = createToaster({
  defaultOptions: {
    duration: 3000,
    isClosable: true,
    position: 'bottom-right',
  }
});
