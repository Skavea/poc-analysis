/**
 * Color Mode Provider
 * ===================
 * 
 * Provides dark/light mode functionality using next-themes
 * Integrates with Chakra UI v3's theming system
 */

'use client';

import { ThemeProvider } from 'next-themes';

interface ColorModeProviderProps {
  children: React.ReactNode;
}

export function ColorModeProvider({ children }: ColorModeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
