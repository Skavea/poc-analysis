/**
 * Chakra UI v3 Provider Component
 * ===============================
 * 
 * Provider component that wraps the application with Chakra UI v3
 * Includes theme provider and color mode support
 */

'use client';

import { ChakraProvider } from "@chakra-ui/react";
import { system } from "@/lib/theme";
import { ColorModeProvider } from './color-mode-provider';

interface ProviderProps {
  children: React.ReactNode;
}

export function Provider({ children }: ProviderProps) {
  return (
    <ColorModeProvider>
      <ChakraProvider value={system}>
        {children}
      </ChakraProvider>
    </ColorModeProvider>
  );
}
