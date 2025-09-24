/**
 * Chakra UI v3 Theme Configuration
 * ================================
 * 
 * Custom theme configuration for the Stock Visualizer application
 * Using Chakra UI v3's new theming system
 */

import { createSystem, defaultConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      // Color tokens
      colors: {
        gray: {
          50: { value: "#f9fafb" },
          100: { value: "#f3f4f6" },
          200: { value: "#e5e7eb" },
          300: { value: "#d1d5db" },
          400: { value: "#9ca3af" },
          500: { value: "#6b7280" },
          600: { value: "#4b5563" },
          700: { value: "#374151" },
          800: { value: "#1f2937" },
          900: { value: "#111827" },
          950: { value: "#030712" },
        },
        primary: {
          50: { value: "#eff6ff" },
          100: { value: "#dbeafe" },
          200: { value: "#bfdbfe" },
          300: { value: "#93c5fd" },
          400: { value: "#60a5fa" },
          500: { value: "#3b82f6" },
          600: { value: "#2563eb" },
          700: { value: "#1d4ed8" },
          800: { value: "#1e40af" },
          900: { value: "#1e3a8a" },
          950: { value: "#172554" },
        },
        secondary: {
          50: { value: "#faf5ff" },
          100: { value: "#f3e8ff" },
          200: { value: "#e9d5ff" },
          300: { value: "#d8b4fe" },
          400: { value: "#c084fc" },
          500: { value: "#a855f7" },
          600: { value: "#9333ea" },
          700: { value: "#7c3aed" },
          800: { value: "#6b21a8" },
          900: { value: "#581c87" },
          950: { value: "#3b0764" },
        },
        success: {
          50: { value: "#f0fdf4" },
          100: { value: "#dcfce7" },
          200: { value: "#bbf7d0" },
          300: { value: "#86efac" },
          400: { value: "#4ade80" },
          500: { value: "#22c55e" },
          600: { value: "#16a34a" },
          700: { value: "#15803d" },
          800: { value: "#166534" },
          900: { value: "#14532d" },
          950: { value: "#052e16" },
        },
        warning: {
          50: { value: "#fffbeb" },
          100: { value: "#fef3c7" },
          200: { value: "#fde68a" },
          300: { value: "#fcd34d" },
          400: { value: "#fbbf24" },
          500: { value: "#f59e0b" },
          600: { value: "#d97706" },
          700: { value: "#b45309" },
          800: { value: "#92400e" },
          900: { value: "#78350f" },
          950: { value: "#451a03" },
        },
        error: {
          50: { value: "#fef2f2" },
          100: { value: "#fee2e2" },
          200: { value: "#fecaca" },
          300: { value: "#fca5a5" },
          400: { value: "#f87171" },
          500: { value: "#ef4444" },
          600: { value: "#dc2626" },
          700: { value: "#b91c1c" },
          800: { value: "#991b1b" },
          900: { value: "#7f1d1d" },
          950: { value: "#450a0a" },
        },
      },
      // Font tokens
      fonts: {
        heading: { value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
        body: { value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
        mono: { value: "'JetBrains Mono', 'Fira Code', monospace" },
      },
      // Font size tokens
      fontSizes: {
        xs: { value: "0.75rem" },
        sm: { value: "0.875rem" },
        md: { value: "1rem" },
        lg: { value: "1.125rem" },
        xl: { value: "1.25rem" },
        "2xl": { value: "1.5rem" },
        "3xl": { value: "1.875rem" },
        "4xl": { value: "2.25rem" },
        "5xl": { value: "3rem" },
        "6xl": { value: "3.75rem" },
      },
      // Spacing tokens
      spacing: {
        px: { value: "1px" },
        0: { value: "0" },
        0.5: { value: "0.125rem" },
        1: { value: "0.25rem" },
        1.5: { value: "0.375rem" },
        2: { value: "0.5rem" },
        2.5: { value: "0.625rem" },
        3: { value: "0.75rem" },
        3.5: { value: "0.875rem" },
        4: { value: "1rem" },
        5: { value: "1.25rem" },
        6: { value: "1.5rem" },
        7: { value: "1.75rem" },
        8: { value: "2rem" },
        9: { value: "2.25rem" },
        10: { value: "2.5rem" },
        11: { value: "2.75rem" },
        12: { value: "3rem" },
        14: { value: "3.5rem" },
        16: { value: "4rem" },
        20: { value: "5rem" },
        24: { value: "6rem" },
        28: { value: "7rem" },
        32: { value: "8rem" },
        36: { value: "9rem" },
        40: { value: "10rem" },
        44: { value: "11rem" },
        48: { value: "12rem" },
        52: { value: "13rem" },
        56: { value: "14rem" },
        60: { value: "15rem" },
        64: { value: "16rem" },
        72: { value: "18rem" },
        80: { value: "20rem" },
        96: { value: "24rem" },
      },
      // Border radius tokens
      radii: {
        none: { value: "0" },
        sm: { value: "0.125rem" },
        base: { value: "0.25rem" },
        md: { value: "0.375rem" },
        lg: { value: "0.5rem" },
        xl: { value: "0.75rem" },
        "2xl": { value: "1rem" },
        "3xl": { value: "1.5rem" },
        full: { value: "9999px" },
      },
      // Shadow tokens
      shadows: {
        xs: { value: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
        sm: { value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
        base: { value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
        md: { value: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" },
        lg: { value: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" },
        xl: { value: "0 25px 50px -12px rgb(0 0 0 / 0.25)" },
        "2xl": { value: "0 25px 50px -12px rgb(0 0 0 / 0.25)" },
        inner: { value: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)" },
        none: { value: "none" },
      },
    },
    // Semantic tokens for consistent theming
    semanticTokens: {
      colors: {
        // Background colors
        bg: {
          canvas: { value: { base: "{colors.gray.50}", _dark: "{colors.gray.950}" } },
          default: { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
          subtle: { value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" } },
          emphasized: { value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" } },
        },
        // Text colors
        fg: {
          default: { value: { base: "{colors.gray.900}", _dark: "{colors.gray.50}" } },
          muted: { value: { base: "{colors.gray.600}", _dark: "{colors.gray.400}" } },
          subtle: { value: { base: "{colors.gray.500}", _dark: "{colors.gray.500}" } },
          inverted: { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
        },
        // Border colors
        border: {
          default: { value: { base: "{colors.gray.200}", _dark: "{colors.gray.800}" } },
          emphasized: { value: { base: "{colors.gray.300}", _dark: "{colors.gray.700}" } },
          subtle: { value: { base: "{colors.gray.100}", _dark: "{colors.gray.900}" } },
        },
        // Brand colors
        brand: {
          default: { value: { base: "{colors.primary.500}", _dark: "{colors.primary.400}" } },
          emphasized: { value: { base: "{colors.primary.600}", _dark: "{colors.primary.300}" } },
          subtle: { value: { base: "{colors.primary.50}", _dark: "{colors.primary.950}" } },
          fg: { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
        },
        // Status colors
        success: {
          default: { value: { base: "{colors.success.500}", _dark: "{colors.success.400}" } },
          emphasized: { value: { base: "{colors.success.600}", _dark: "{colors.success.300}" } },
          subtle: { value: { base: "{colors.success.50}", _dark: "{colors.success.950}" } },
          fg: { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
        },
        warning: {
          default: { value: { base: "{colors.warning.500}", _dark: "{colors.warning.400}" } },
          emphasized: { value: { base: "{colors.warning.600}", _dark: "{colors.warning.300}" } },
          subtle: { value: { base: "{colors.warning.50}", _dark: "{colors.warning.950}" } },
          fg: { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
        },
        error: {
          default: { value: { base: "{colors.error.500}", _dark: "{colors.error.400}" } },
          emphasized: { value: { base: "{colors.error.600}", _dark: "{colors.error.300}" } },
          subtle: { value: { base: "{colors.error.50}", _dark: "{colors.error.950}" } },
          fg: { value: { base: "{colors.white}", _dark: "{colors.gray.900}" } },
        },
      },
    },
  },
});