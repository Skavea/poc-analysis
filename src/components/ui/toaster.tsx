'use client';

/**
 * Toaster Component
 * ================
 * 
 * Centralized toast notification system for Chakra UI v3
 */

import { createToaster, Toaster as ChakraToaster } from '@chakra-ui/react';

// Create and export the toast store
const toastStore = createToaster({});

// Export the toast function
export const toast = toastStore.create;

// Export the Toaster component
export const Toaster = ChakraToaster;
